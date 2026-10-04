import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const membersTable = pgTable(
  "milaap_members",
  {
    id: text("id").primaryKey(),
    displayName: text("display_name").notNull().default("New member"),
    email: text("email").notNull().default(""),
    bio: text("bio"),
    ageRange: text("age_range"),
    city: text("city"),
    locality: text("locality"),
    language: text("language").notNull().default("English"),
    interests: text("interests")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    skillsOffered: text("skills_offered")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    skillsWanted: text("skills_wanted")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    availability: text("availability")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    preferredActivities: text("preferred_activities")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    profileVisibility: text("profile_visibility").notNull().default("community"),
    groupActivities: boolean("group_activities").notNull().default(true),
    onboardingComplete: boolean("onboarding_complete").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("milaap_members_name_idx").on(table.displayName)],
);

export const communitiesTable = pgTable(
  "milaap_communities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    type: text("type").notNull().default("neighbourhood"),
    city: text("city"),
    guidelines: text("guidelines").notNull().default("Be kind, respect privacy, and meet in public or organised community spaces."),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("milaap_communities_name_idx").on(table.name)],
);

export const communityMembershipsTable = pgTable(
  "milaap_community_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    communityId: uuid("community_id")
      .notNull()
      .references(() => communitiesTable.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => membersTable.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("approved"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("milaap_memberships_member_community_idx").on(
      table.communityId,
      table.userId,
    ),
    index("milaap_memberships_user_idx").on(table.userId),
  ],
);