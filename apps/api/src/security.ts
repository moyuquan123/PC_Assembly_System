import { createHash, randomBytes } from "node:crypto";

export const SESSION_COOKIE = "pc_admin_session";
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export function createOpaqueToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashToken(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
