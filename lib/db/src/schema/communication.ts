import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { membersTable } from "./members";
import { connectionsTable } from "./engagement";

export const conversationsTable = pgTable(
  "milaap_conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => connectionsTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("milaap_conversation_connection_idx").on(table.connectionId),
  ],
);

export const conversationMembersTable = pgTable(
  "milaap_conversation_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversationsTable.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => membersTable.id, { onDelete: "cascade" }),
    lastReadAt: timestamp("last_read_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("milaap_conversation_member_idx").on(
      table.conversationId,
      table.userId,
    ),
    index("milaap_conversation_user_idx").on(table.userId),
  ],
);

export const messagesTable = pgTable(
  "milaap_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversationsTable.id, { onDelete: "cascade" }),
    senderId: text("sender_id")
      .notNull()
      .references(() => membersTable.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("milaap_messages_conversation_idx").on(table.conversationId, table.createdAt)],
);

export const notificationsTable = pgTable(
  "milaap_notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => membersTable.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    href: text("href"),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("milaap_notifications_user_idx").on(table.userId, table.createdAt)],
);

export const reportsTable = pgTable(
  "milaap_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reporterId: text("reporter_id")
      .notNull()
      .references(() => membersTable.id, { onDelete: "cascade" }),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    reason: text("reason").notNull(),
    status: text("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("milaap_reports_status_idx").on(table.status, table.createdAt)],
);

export const blocksTable = pgTable(
  "milaap_blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    blockerId: text("blocker_id")
      .notNull()
      .references(() => membersTable.id, { onDelete: "cascade" }),
    blockedId: text("blocked_id")
      .notNull()
      .references(() => membersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("milaap_block_pair_idx").on(table.blockerId, table.blockedId),
  ],
);