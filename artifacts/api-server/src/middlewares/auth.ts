import { getAuth } from "@clerk/express";
import type { RequestHandler } from "express";
import { membersTable } from "@workspace/db";
import { db } from "@workspace/db";

function claimString(
  claims: Record<string, unknown> | null | undefined,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = claims?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

export const requireAuth: RequestHandler = async (req, res, next) => {
  const auth = getAuth(req);
  if (!auth.userId) {
    res.status(401).json({ error: "Sign in to continue." });
    return;
  }

  const claims = auth.sessionClaims as Record<string, unknown> | null;
  const displayName =
    claimString(claims, ["name", "preferred_username", "given_name"]) ??
    "New member";
  const email = claimString(claims, ["email", "primary_email_address"]) ?? "";

  await db
    .insert(membersTable)
    .values({ id: auth.userId, displayName, email })
    .onConflictDoNothing({ target: membersTable.id });

  res.locals.memberId = auth.userId;
  next();
};