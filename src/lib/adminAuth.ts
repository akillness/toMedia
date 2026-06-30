import { timingSafeEqual } from "node:crypto";

/**
 * Admin gate for credential/ingest writes. Callers must send a matching
 * `x-lever-admin` header, compared in constant time. With no LEVER_ADMIN_TOKEN
 * set, writes are open in dev but FAIL CLOSED in production, so a forgotten
 * token never silently exposes privileged endpoints.
 */
export function isAdminAuthorized(request: Request): boolean {
  const expected = process.env.LEVER_ADMIN_TOKEN;
  if (!expected) return process.env.NODE_ENV !== "production";
  const provided = request.headers.get("x-lever-admin") ?? "";
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
