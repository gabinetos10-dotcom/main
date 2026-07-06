import { createHash } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "lnj_admin";

function adminToken(): string {
  const password = process.env.ADMIN_PASSWORD || "locnjoy-admin";
  return createHash("sha256").update(`lnj:${password}`).digest("hex");
}

export function verifyPassword(password: string): boolean {
  return password === (process.env.ADMIN_PASSWORD || "locnjoy-admin");
}

export async function setAdminSession() {
  const store = await cookies();
  store.set(COOKIE_NAME, adminToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8, // 8 hours
    path: "/",
  });
}

export async function clearAdminSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value === adminToken();
}
