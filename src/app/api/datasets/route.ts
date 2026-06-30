import { NextResponse } from "next/server";
import { createStorage } from "@/lib/storage";

/**
 * GET /api/datasets
 * Lists persisted datasets (newest first) from the active store
 * (Firestore in production, in-memory in the demo). Rows are omitted to keep
 * the listing light; fetch a single dataset's rows via its id when needed.
 */
export async function GET() {
  const datasets = await createStorage().listDatasets();
  return NextResponse.json({
    count: datasets.length,
    datasets: datasets.map(({ id, name, createdAt, rows }) => ({
      id,
      name,
      createdAt,
      rowCount: rows.length,
    })),
  });
}
