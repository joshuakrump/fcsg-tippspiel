"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "node:crypto";

function createAdminToken() {
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET fehlt.");
  }

  return createHmac("sha256", secret)
    .update("fcsg-admin-session")
    .digest("hex");
}

function safeCompare(valueA: string, valueB: string) {
  const a = Buffer.from(valueA);
  const b = Buffer.from(valueB);

  if (a.length !== b.length) {
    return false;
  }

  return timingSafeEqual(a, b);
}

export async function adminLogin(formData: FormData) {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  const correctUsername = process.env.ADMIN_USERNAME;
  const correctPassword = process.env.ADMIN_PASSWORD;
    
  if (!correctUsername || !correctPassword) {
    redirect("/admin-login?error=config");
  }

  const usernameCorrect = safeCompare(
    username,
    correctUsername
  );

  const passwordCorrect = safeCompare(
    password,
    correctPassword
  );

  if (!usernameCorrect || !passwordCorrect) {
    redirect("/admin-login?error=login");
  }

  const cookieStore = await cookies();

  cookieStore.set("fcsg-admin-session", createAdminToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 4,
  });

  redirect("/admin");
}