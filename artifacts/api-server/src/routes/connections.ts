import { and, eq, or } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  CreateConnectionBody,
  CreateConnectionResponse,
  DeleteConnectionParams,
  ListConnectionsResponse,
  UpdateConnectionBody,
  UpdateConnectionParams,
  UpdateConnectionResponse,
} from "@workspace/api-zod";
import {
  blocksTable,
  communityMembershipsTable,
  connectionsTable,
  db,
  membersTable,
} from "@workspace/db";
import {
  createNotification,
  ensureConversation,
  isUuid,
} from "../lib/milaap";

const router: IRouter = Router();

async function connectionView(connection: typeof connectionsTable.$inferSelect, userId: string) {
  const otherUserId =
    connection.requesterId === userId
      ? connection.recipientId
      : connection.requesterId;
  const [other, current] = await Promise.all([
    db
      .select()
      .from(membersTable)
      .where(eq(membersTable.id, otherUserId))
      .limit(1),
    db
      .select()
      .from(membersTable)
      .where(eq(membersTable.id, userId))
      .limit(1),
  ]);
  const counterpart = other[0];
  const member = current[0];
  return {
    id: connection.id,
    otherUserId,
    otherDisplayName: counterpart?.displayName ?? "Community member",
    otherBio: counterpart?.bio ?? null,
    status: connection.status as "pending" | "accepted" | "declined" | "cancelled",
    direction:
      connection.status === "accepted"
        ? "connected"
        : connection.recipientId === userId
          ? "incoming"
          : "outgoing",
    sharedInterests:
      counterpart && member
        ? member.interests.filter((interest) =>
            counterpart.interests.some(
              (otherInterest) =>
                otherInterest.toLowerCase() === interest.toLowerCase(),
            ),
          )
        : [],
    complementarySkills:
      counterpart && member
        ? [
            ...member.skillsOffered.filter((skill) =>
              counterpart.skillsWanted.some(
                (wanted) => wanted.toLowerCase() === skill.toLowerCase(),
              ),
            ),
            ...member.skillsWanted.filter((skill) =>
              counterpart.skillsOffered.some(
                (offered) => offered.toLowerCase() === skill.toLowerCase(),
              ),
            ),
          ]
        : [],
    createdAt: connection.createdAt.toISOString(),
  };
}

router.get("/connections", async (_req, res): Promise<void> => {
  const userId = res.locals.memberId as string;
  const connections = await db
    .select()
    .from(connectionsTable)
    .where(
      or(
        eq(connectionsTable.requesterId, userId),
        eq(connectionsTable.recipientId, userId),
      ),
    )
    .orderBy(connectionsTable.createdAt);
  const views = await Promise.all(
    connections.map((connection) => connectionView(connection, userId)),
  );
  res.json(ListConnectionsResponse.parse(views));
});

router.post("/connections", async (req, res): Promise<void> => {
  const parsed = CreateConnectionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const userId = res.locals.memberId as string;
  const recipientId = parsed.data.recipientId;
  if (recipientId === userId) {
    res.status(400).json({ error: "You cannot send a request to yourself." });
    return;
  }
  const [recipient] = await db
    .select()
    .from(membersTable)
    .where(eq(membersTable.id, recipientId))
    .limit(1);
  if (!recipient || recipient.profileVisibility === "private") {
    res.status(404).json({ error: "That member is not available." });
    return;
  }
  if (recipient.profileVisibility === "community") {
    const [senderCommunities, recipientCommunities] = await Promise.all([
      db
        .select({ communityId: communityMembershipsTable.communityId })
        .from(communityMembershipsTable)
        .where(
          and(
            eq(communityMembershipsTable.userId, userId),
            eq(communityMembershipsTable.status, "approved"),
          ),
        ),
      db
        .select({ communityId: communityMembershipsTable.communityId })
        .from(communityMembershipsTable)
        .where(
          and(
            eq(communityMembershipsTable.userId, recipientId),
            eq(communityMembershipsTable.status, "approved"),
          ),
        ),
    ]);
    const senderCommunityIds = new Set(
      senderCommunities.map(({ communityId }) => communityId),
    );
    if (!recipientCommunities.some(({ communityId }) => senderCommunityIds.has(communityId))) {
      res.status(404).json({ error: "That member is not available." });
      return;
    }
  }
  const [blocked] = await db
    .select()
    .from(blocksTable)
    .where(
      or(
        and(
          eq(blocksTable.blockerId, userId),
          eq(blocksTable.blockedId, recipientId),
        ),
        and(
          eq(blocksTable.blockerId, recipientId),
          eq(blocksTable.blockedId, userId),
        ),
      ),
    )
    .limit(1);
  if (blocked) {
    res.status(409).json({ error: "This connection is unavailable." });
    return;
  }
  const [existing] = await db
    .select()
    .from(connectionsTable)
    .where(
      or(
        and(
          eq(connectionsTable.requesterId, userId),
          eq(connectionsTable.recipientId, recipientId),
        ),
        and(
          eq(connectionsTable.requesterId, recipientId),
          eq(connectionsTable.recipientId, userId),
        ),
      ),
    )
    .limit(1);
  if (existing) {
    res.status(409).json({ error: "A connection request already exists." });
    return;
  }
  const [created] = await db
    .insert(connectionsTable)
    .values({
      requesterId: userId,
      recipientId,
      message: parsed.data.message ?? null,
    })
    .returning();
  await createNotification(
    recipientId,
    "connection_request",
    "A neighbour would like to connect",
    parsed.data.message?.trim() || "You have a new connection request.",
    "/connections",
  );
  res.status(201).json(
    CreateConnectionResponse.parse(await connectionView(created, userId)),
  );
});

router.patch("/connections/:id", async (req, res): Promise<void> => {
  const params = UpdateConnectionParams.safeParse(req.params);
  const body = UpdateConnectionBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  if (!isUuid(params.data.id)) {
    res.status(400).json({ error: "Choose a valid connection." });
    return;
  }
  const userId = res.locals.memberId as string;
  const [connection] = await db
    .select()
    .from(connectionsTable)
    .where(eq(connectionsTable.id, params.data.id))
    .limit(1);
  if (!connection) {
    res.status(404).json({ error: "Connection request not found." });
    return;
  }
  const isRequester = connection.requesterId === userId;
  const isRecipient = connection.recipientId === userId;
  const mayRespond =
    connection.status === "pending" &&
    ((body.data.status === "cancelled" && isRequester) ||
      ((body.data.status === "accepted" || body.data.status === "declined") &&
        isRecipient));
  if (!mayRespond) {
    res.status(403).json({ error: "You cannot change this request." });
    return;
  }
  const [updated] = await db
    .update(connectionsTable)
    .set({ status: body.data.status })
    .where(eq(connectionsTable.id, connection.id))
    .returning();
  if (body.data.status === "accepted") {
    await ensureConversation(connection.id);
    await createNotification(
      connection.requesterId,
      "connection_accepted",
      "Your connection request was accepted",
      "You can now plan a community activity together.",
      "/connections",
    );
  }
  if (body.data.status === "declined" || body.data.status === "cancelled") {
    const recipient =
      body.data.status === "declined"
        ? connection.requesterId
        : connection.recipientId;
    await createNotification(
      recipient,
      "connection_update",
      "Connection request updated",
      `The request was ${body.data.status}.`,
      "/connections",
    );
  }
  res.json(
    UpdateConnectionResponse.parse(await connectionView(updated, userId)),
  );
});

router.delete("/connections/:id", async (req, res): Promise<void> => {
  const params = DeleteConnectionParams.safeParse(req.params);
  if (!params.success || !isUuid(params.data?.id ?? "")) {
    res.status(400).json({ error: "Choose a valid connection." });
    return;
  }
  const userId = res.locals.memberId as string;
  const [connection] = await db
    .select()
    .from(connectionsTable)
    .where(eq(connectionsTable.id, params.data.id))
    .limit(1);
  if (
    !connection ||
    (connection.requesterId !== userId && connection.recipientId !== userId)
  ) {
    res.status(404).json({ error: "Connection not found." });
    return;
  }
  if (connection.status === "pending" && connection.requesterId !== userId) {
    res.status(403).json({ error: "Only the sender can cancel a pending request." });
    return;
  }
  await db.delete(connectionsTable).where(eq(connectionsTable.id, connection.id));
  res.sendStatus(204);
});

export default router;