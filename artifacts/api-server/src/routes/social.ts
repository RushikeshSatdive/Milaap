import { and, count, desc, eq, ne, or, gt } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  BlockUserParams,
  BlockUserResponse,
  CreateReportBody,
  CreateReportResponse,
  ListConversationsResponse,
  ListMessagesParams,
  ListMessagesResponse,
  ListNotificationsResponse,
  MarkAllNotificationsReadResponse,
  SendMessageBody,
  SendMessageParams,
  SendMessageResponse,
} from "@workspace/api-zod";
import {
  blocksTable,
  connectionsTable,
  conversationMembersTable,
  conversationsTable,
  db,
  membersTable,
  messagesTable,
  notificationsTable,
  reportsTable,
} from "@workspace/db";
import {
  createNotification,
  ensureConversation,
  isUuid,
} from "../lib/milaap";

const router: IRouter = Router();

router.get("/notifications", async (_req, res): Promise<void> => {
  const notifications = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, res.locals.memberId as string))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(100);
  res.json(
    ListNotificationsResponse.parse(
      notifications.map((notification) => ({
        ...notification,
        createdAt: notification.createdAt.toISOString(),
      })),
    ),
  );
});

router.patch("/notifications/read-all", async (_req, res): Promise<void> => {
  const updated = await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(
      and(
        eq(notificationsTable.userId, res.locals.memberId as string),
        eq(notificationsTable.isRead, false),
      ),
    )
    .returning({ id: notificationsTable.id });
  res.json(MarkAllNotificationsReadResponse.parse({ count: updated.length }));
});

router.get("/conversations", async (_req, res): Promise<void> => {
  const userId = res.locals.memberId as string;
  const accepted = await db
    .select()
    .from(connectionsTable)
    .where(
      and(
        eq(connectionsTable.status, "accepted"),
        or(
          eq(connectionsTable.requesterId, userId),
          eq(connectionsTable.recipientId, userId),
        ),
      ),
    );
  await Promise.all(
    accepted.map((connection) => ensureConversation(connection.id)),
  );

  const memberships = await db
    .select({
      conversation: conversationsTable,
      currentMember: conversationMembersTable,
    })
    .from(conversationMembersTable)
    .innerJoin(
      conversationsTable,
      eq(conversationMembersTable.conversationId, conversationsTable.id),
    )
    .where(eq(conversationMembersTable.userId, userId));
  const conversations = await Promise.all(
    memberships.map(async ({ conversation, currentMember }) => {
      const [otherMember] = await db
        .select({
          id: conversationMembersTable.userId,
          lastReadAt: conversationMembersTable.lastReadAt,
          displayName: membersTable.displayName,
        })
        .from(conversationMembersTable)
        .innerJoin(
          membersTable,
          eq(conversationMembersTable.userId, membersTable.id),
        )
        .where(
          and(
            eq(conversationMembersTable.conversationId, conversation.id),
            ne(conversationMembersTable.userId, userId),
          ),
        )
        .limit(1);
      if (!otherMember) return null;
      const [lastMessage] = await db
        .select()
        .from(messagesTable)
        .where(eq(messagesTable.conversationId, conversation.id))
        .orderBy(desc(messagesTable.createdAt))
        .limit(1);
      const [unread] = await db
        .select({ value: count() })
        .from(messagesTable)
        .where(
          and(
            eq(messagesTable.conversationId, conversation.id),
            ne(messagesTable.senderId, userId),
            currentMember.lastReadAt
              ? gt(messagesTable.createdAt, currentMember.lastReadAt)
              : undefined,
          ),
        );
      return {
        id: conversation.id,
        otherUserId: otherMember.id,
        otherDisplayName: otherMember.displayName,
        lastMessage: lastMessage?.body ?? null,
        lastMessageAt: lastMessage?.createdAt.toISOString() ?? null,
        unreadCount: Number(unread?.value ?? 0),
      };
    }),
  );
  res.json(
    ListConversationsResponse.parse(
      conversations.filter((conversation) => conversation !== null),
    ),
  );
});

router.get("/conversations/:id/messages", async (req, res): Promise<void> => {
  const params = ListMessagesParams.safeParse(req.params);
  if (!params.success || !isUuid(params.data?.id ?? "")) {
    res.status(400).json({ error: "Choose a valid conversation." });
    return;
  }
  const userId = res.locals.memberId as string;
  const [membership] = await db
    .select()
    .from(conversationMembersTable)
    .where(
      and(
        eq(conversationMembersTable.conversationId, params.data.id),
        eq(conversationMembersTable.userId, userId),
      ),
    )
    .limit(1);
  if (!membership) {
    res.status(404).json({ error: "Conversation not found." });
    return;
  }
  const messages = await db
    .select({
      message: messagesTable,
      senderName: membersTable.displayName,
    })
    .from(messagesTable)
    .innerJoin(membersTable, eq(messagesTable.senderId, membersTable.id))
    .where(eq(messagesTable.conversationId, params.data.id))
    .orderBy(messagesTable.createdAt)
    .limit(500);
  await db
    .update(conversationMembersTable)
    .set({ lastReadAt: new Date() })
    .where(eq(conversationMembersTable.id, membership.id));
  res.json(
    ListMessagesResponse.parse(
      messages.map(({ message, senderName }) => ({
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        senderName,
        body: message.body,
        createdAt: message.createdAt.toISOString(),
      })),
    ),
  );
});

router.post("/conversations/:id/messages", async (req, res): Promise<void> => {
  const params = SendMessageParams.safeParse(req.params);
  const body = SendMessageBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  if (!isUuid(params.data.id)) {
    res.status(400).json({ error: "Choose a valid conversation." });
    return;
  }
  const userId = res.locals.memberId as string;
  const [membership] = await db
    .select()
    .from(conversationMembersTable)
    .where(
      and(
        eq(conversationMembersTable.conversationId, params.data.id),
        eq(conversationMembersTable.userId, userId),
      ),
    )
    .limit(1);
  if (!membership) {
    res.status(404).json({ error: "Conversation not found." });
    return;
  }
  const [conversation] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, params.data.id))
    .limit(1);
  const [connection] = conversation
    ? await db
        .select()
        .from(connectionsTable)
        .where(
          and(
            eq(connectionsTable.id, conversation.connectionId),
            eq(connectionsTable.status, "accepted"),
          ),
        )
        .limit(1)
    : [];
  if (!connection) {
    res.status(403).json({ error: "Messaging is available only after a connection is accepted." });
    return;
  }
  const otherUserId =
    connection.requesterId === userId
      ? connection.recipientId
      : connection.requesterId;
  const [blocked] = await db
    .select()
    .from(blocksTable)
    .where(
      or(
        and(
          eq(blocksTable.blockerId, userId),
          eq(blocksTable.blockedId, otherUserId),
        ),
        and(
          eq(blocksTable.blockerId, otherUserId),
          eq(blocksTable.blockedId, userId),
        ),
      ),
    )
    .limit(1);
  if (blocked) {
    res.status(403).json({ error: "Messaging is unavailable for this connection." });
    return;
  }
  const oneMinuteAgo = new Date(Date.now() - 60_000);
  const [recentMessageCount] = await db
    .select({ value: count() })
    .from(messagesTable)
    .where(
      and(
        eq(messagesTable.conversationId, params.data.id),
        eq(messagesTable.senderId, userId),
        gt(messagesTable.createdAt, oneMinuteAgo),
      ),
    );
  if (Number(recentMessageCount?.value ?? 0) >= 20) {
    res.status(429).json({ error: "Please wait a moment before sending more messages." });
    return;
  }
  const [sent] = await db
    .insert(messagesTable)
    .values({
      conversationId: params.data.id,
      senderId: userId,
      body: body.data.body.trim(),
    })
    .returning();
  const [sender] = await db
    .select({ name: membersTable.displayName })
    .from(membersTable)
    .where(eq(membersTable.id, userId))
    .limit(1);
  await db
    .update(conversationMembersTable)
    .set({ lastReadAt: new Date() })
    .where(eq(conversationMembersTable.id, membership.id));
  await createNotification(
    otherUserId,
    "message",
    `New message from ${sender?.name ?? "a community member"}`,
    sent.body.slice(0, 140),
    `/messages/${params.data.id}`,
  );
  res.status(201).json(
    SendMessageResponse.parse({
      id: sent.id,
      conversationId: sent.conversationId,
      senderId: sent.senderId,
      senderName: sender?.name ?? "Community member",
      body: sent.body,
      createdAt: sent.createdAt.toISOString(),
    }),
  );
});

router.post("/reports", async (req, res): Promise<void> => {
  const parsed = CreateReportBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [report] = await db
    .insert(reportsTable)
    .values({
      reporterId: res.locals.memberId as string,
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
      reason: parsed.data.reason.trim(),
    })
    .returning();
  res.status(201).json(
    CreateReportResponse.parse({ id: report.id, status: report.status }),
  );
});

router.post("/users/:id/block", async (req, res): Promise<void> => {
  const params = BlockUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const userId = res.locals.memberId as string;
  const blockedId = params.data.id;
  if (blockedId === userId) {
    res.status(400).json({ error: "You cannot block yourself." });
    return;
  }
  const [other] = await db
    .select({ id: membersTable.id })
    .from(membersTable)
    .where(eq(membersTable.id, blockedId))
    .limit(1);
  if (!other) {
    res.status(404).json({ error: "Member not found." });
    return;
  }
  await db
    .insert(blocksTable)
    .values({ blockerId: userId, blockedId })
    .onConflictDoNothing();
  await db
    .delete(connectionsTable)
    .where(
      or(
        and(
          eq(connectionsTable.requesterId, userId),
          eq(connectionsTable.recipientId, blockedId),
        ),
        and(
          eq(connectionsTable.requesterId, blockedId),
          eq(connectionsTable.recipientId, userId),
        ),
      ),
    );
  res.sendStatus(204);
});

export default router;