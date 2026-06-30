import { afterEach, describe, expect, it } from "vitest";
import {
  InMemoryStorage,
  FirestoreStorage,
  createStorage,
  hasFirebaseConfig,
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
  ] as const;
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));

  afterEach(() => {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
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
});
