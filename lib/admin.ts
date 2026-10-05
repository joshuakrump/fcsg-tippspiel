import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

function createExpectedToken() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!secret || !username || !password) {
    return null;
  }

  return createHmac("sha256", secret)
    .update(`fcsg-admin-session:${username}:${password}`)
    .digest("hex");
}

export async function isAdmin() {
  const cookieStore = await cookies();

  const receivedToken = cookieStore.get(
    "fcsg-admin-session",
  )?.value;

  const expectedToken = createExpectedToken();

  if (!receivedToken || !expectedToken) {
    return false;
  }

  const received = Buffer.from(receivedToken);
  const expected = Buffer.from(expectedToken);

  if (received.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(received, expected);
}
