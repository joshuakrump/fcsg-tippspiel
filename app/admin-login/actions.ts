"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin-client";

const LOGIN_WINDOW_MINUTES = 15;
const MAX_FAILED_ATTEMPTS = 5;

function createAdminToken() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!secret || !username || !password) {
    throw new Error("Admin-Konfiguration fehlt.");
  }

  return createHmac("sha256", secret)
    .update(`fcsg-admin-session:${username}:${password}`)
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

async function getLoginIdentifier() {
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET fehlt.");
  }

  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for") ?? "unknown";
  const ip = forwardedFor.split(",")[0]?.trim() || "unknown";

  return createHmac("sha256", secret)
    .update(`admin-login:${ip}`)
    .digest("hex");
}

export async function adminLogin(formData: FormData) {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  const correctUsername = process.env.ADMIN_USERNAME;
  const correctPassword = process.env.ADMIN_PASSWORD;

  if (!correctUsername || !correctPassword) {
    redirect("/admin-login?error=config");
  }

  const supabase = createAdminClient();
  const identifierHash = await getLoginIdentifier();
  const cutoff = new Date(
    Date.now() - LOGIN_WINDOW_MINUTES * 60 * 1000,
  ).toISOString();

  const { count, error: countError } = await supabase
    .from("admin_login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("identifier_hash", identifierHash)
    .eq("success", false)
    .gte("created_at", cutoff);

  if (countError) {
    console.error("Admin-Login Rate-Limit konnte nicht geprüft werden:", countError.message);
    redirect("/admin-login?error=config");
  }

  if ((count ?? 0) >= MAX_FAILED_ATTEMPTS) {
    redirect("/admin-login?error=rate-limit");
  }

  const usernameCorrect = safeCompare(username, correctUsername);
  const passwordCorrect = safeCompare(password, correctPassword);

  if (!usernameCorrect || !passwordCorrect) {
    const { error: insertError } = await supabase
      .from("admin_login_attempts")
      .insert({ identifier_hash: identifierHash, success: false });

    if (insertError) {
      console.error("Admin-Login Versuch konnte nicht protokolliert werden:", insertError.message);
      redirect("/admin-login?error=config");
    }

    redirect("/admin-login?error=login");
  }

  await supabase
    .from("admin_login_attempts")
    .delete()
    .eq("identifier_hash", identifierHash);

  // Alte Einträge gelegentlich mitbereinigen.
  await supabase
    .from("admin_login_attempts")
    .delete()
    .lt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

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
