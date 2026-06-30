import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  InMemoryStorage,
  FirestoreStorage,
  LocalFileStorage,
  createStorage,
  hasFirebaseConfig,
  hasLocalDbConfig,
  resetStorageCache,
} from "./storage";
import type { AdRow } from "./types";

const sampleRows: AdRow[] = [
  {
    id: "a",
    name: "Ad A",
    channel: "google",
    spend: 100,
    revenue: 250,
    conversions: 10,
    clicks: 50,
    impressions: 1000,
  },
];

describe("InMemoryStorage", () => {
  it("round-trips a saved dataset by id", async () => {
    const store = new InMemoryStorage();
    const saved = await store.saveDataset("Q1", sampleRows);
    expect(saved.id).toMatch(/^ds-\d+$/);
    const got = await store.getDataset(saved.id);
    expect(got).not.toBeNull();
    expect(got!.name).toBe("Q1");
    expect(got!.rows).toEqual(sampleRows);
  });

  it("returns null for an unknown id", async () => {
    const store = new InMemoryStorage();
    expect(await store.getDataset("nope")).toBeNull();
  });

  it("lists datasets newest-first", async () => {
    const store = new InMemoryStorage();
    const first = await store.saveDataset("old", sampleRows);
    const second = await store.saveDataset("new", sampleRows);
    const list = await store.listDatasets();
    expect(list.map((d) => d.id)).toEqual([second.id, first.id]);
  });
});

describe("storage selection", () => {
  const keys = [
    "FIREBASE_PROJECT_ID",
    "FIREBASE_CLIENT_EMAIL",
    "FIREBASE_PRIVATE_KEY",
    "GOOGLE_APPLICATION_CREDENTIALS",
    "LEVER_DB_PATH",
  ] as const;
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));

  afterEach(() => {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
    resetStorageCache();
  });

  it("hasFirebaseConfig is false without credentials", () => {
    for (const k of keys) delete process.env[k];
    expect(hasFirebaseConfig()).toBe(false);
    expect(createStorage()).toBeInstanceOf(InMemoryStorage);
  });

  it("hasFirebaseConfig is true with a full service account", () => {
    for (const k of keys) delete process.env[k];
    process.env.FIREBASE_PROJECT_ID = "p";
    process.env.FIREBASE_CLIENT_EMAIL = "e@p.iam";
    process.env.FIREBASE_PRIVATE_KEY = "key";
    expect(hasFirebaseConfig()).toBe(true);
    expect(createStorage()).toBeInstanceOf(FirestoreStorage);
  });

  it("hasFirebaseConfig is true with application-default credentials", () => {
    for (const k of keys) delete process.env[k];
    process.env.GOOGLE_APPLICATION_CREDENTIALS = "/path/sa.json";
    expect(hasFirebaseConfig()).toBe(true);
  });

  it("memoizes the adapter so in-memory data persists across calls", () => {
    for (const k of keys) delete process.env[k];
    resetStorageCache();
    const a = createStorage();
    const b = createStorage();
    expect(a).toBe(b); // same instance within a process
  });
});

describe("LocalFileStorage", () => {
  let dir: string;
  let path: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "lever-db-"));
    path = join(dir, "db.json");
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("persists a dataset across separate instances", async () => {
    const writer = new LocalFileStorage(path);
    const saved = await writer.saveDataset("Q1", sampleRows);
    const reader = new LocalFileStorage(path);
    const got = await reader.getDataset(saved.id);
    expect(got?.name).toBe("Q1");
    expect(got?.rows).toEqual(sampleRows);
  });

  it("lists datasets newest-first and does not leak the seq field", async () => {
    const store = new LocalFileStorage(path);
    const first = await store.saveDataset("old", sampleRows);
    const second = await store.saveDataset("new", sampleRows);
    const list = await store.listDatasets();
    expect(list.map((d) => d.id)).toEqual([second.id, first.id]);
    expect(Object.keys(list[0])).toEqual(["id", "name", "rows", "createdAt"]);
  });

  it("returns null for an unknown id and [] for an empty/missing file", async () => {
    const store = new LocalFileStorage(path);
    expect(await store.getDataset("nope")).toBeNull();
    expect(await store.listDatasets()).toEqual([]);
  });
});

describe("local DB selection", () => {
  const saved = {
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
    GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    LEVER_DB_PATH: process.env.LEVER_DB_PATH,
  };
  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    resetStorageCache();
  });

  it("selects LocalFileStorage when LEVER_DB_PATH is set and Firebase is not", () => {
    for (const k of Object.keys(saved)) delete process.env[k];
    process.env.LEVER_DB_PATH = "/tmp/lever/db.json";
    resetStorageCache();
    expect(hasLocalDbConfig()).toBe(true);
    expect(createStorage()).toBeInstanceOf(LocalFileStorage);
  });

  it("Firebase config wins over a local DB path", () => {
    for (const k of Object.keys(saved)) delete process.env[k];
    process.env.LEVER_DB_PATH = "/tmp/lever/db.json";
    process.env.FIREBASE_PROJECT_ID = "p";
    process.env.FIREBASE_CLIENT_EMAIL = "e@p.iam";
    process.env.FIREBASE_PRIVATE_KEY = "key";
    resetStorageCache();
    expect(createStorage()).toBeInstanceOf(FirestoreStorage);
  });
});
