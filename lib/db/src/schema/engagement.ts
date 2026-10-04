import {
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { communitiesTable, membersTable } from "./members";

export const connectionsTable = pgTable(
  "milaap_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requesterId: text("requester_id")
      .notNull()
      .references(() => membersTable.id, { onDelete: "cascade" }),
    recipientId: text("recipient_id")
      .notNull()
      .references(() => membersTable.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"),
    message: text("message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("milaap_connections_pair_idx").on(
      table.requesterId,
      table.recipientId,
    ),
    index("milaap_connections_recipient_idx").on(table.recipientId, table.status),
  ],
);

export const activitiesTable = pgTable(
  "milaap_activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    hostId: text("host_id")
      .notNull()
      .references(() => membersTable.id, { onDelete: "cascade" }),
    communityId: uuid("community_id").references(() => communitiesTable.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: text("category").notNull(),
    durationMinutes: integer("duration_minutes").notNull().default(20),
    format: text("format").notNull().default("group"),
    accessibility: text("accessibility"),
    materials: text("materials"),
    meetingPoint: text("meeting_point"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    capacity: integer("capacity").notNull().default(8),
    status: text("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("milaap_activities_status_idx").on(table.status),
    index("milaap_activities_schedule_idx").on(table.scheduledAt),
    index("milaap_activities_community_idx").on(table.communityId),
  ],
);

export const activityParticipantsTable = pgTable(
  "milaap_activity_participants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    activityId: uuid("activity_id")
      .notNull()
      .references(() => activitiesTable.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => membersTable.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("requested"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("milaap_activity_participant_idx").on(
      table.activityId,
      table.userId,
    ),
  ],
);

export const skillListingsTable = pgTable(
  "milaap_skill_listings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => membersTable.id, { onDelete: "cascade" }),
    skill: text("skill").notNull(),
    type: text("type").notNull(),
    description: text("description").notNull().default(""),
    experienceLevel: text("experience_level").notNull().default("Any level"),
    format: text("format").notNull().default("In person"),
    availability: text("availability").notNull().default("Flexible"),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("milaap_skills_type_idx").on(table.type, table.status),
    index("milaap_skills_user_idx").on(table.userId),
  ],
);

export const projectsTable = pgTable(
  "milaap_projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => membersTable.id, { onDelete: "cascade" }),
    communityId: uuid("community_id").references(() => communitiesTable.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: text("category").notNull(),
    status: text("status").notNull().default("proposed"),
    targetDate: date("target_date", { mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("milaap_projects_status_idx").on(table.status),
    index("milaap_projects_community_idx").on(table.communityId),
  ],
);

export const projectMembersTable = pgTable(
  "milaap_project_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projectsTable.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => membersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("milaap_project_member_idx").on(table.projectId, table.userId),
  ],
);