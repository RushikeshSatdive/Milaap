import { and, count, desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  GetDashboardResponse,
  GetMyProfileResponse,
  UpdateMyProfileBody,
  UpdateMyProfileResponse,
} from "@workspace/api-zod";
import {
  connectionsTable,
  communityMembershipsTable,
  communitiesTable,
  db,
  membersTable,
  notificationsTable,
} from "@workspace/db";
import {
  getProfile,
  isUuid,
  listActivities,
  listPeople,
} from "../lib/milaap";

const router: IRouter = Router();

router.get("/me", async (_req, res): Promise<void> => {
  const profile = await getProfile(res.locals.memberId as string);
  if (!profile) {
    res.status(404).json({ error: "Profile not found." });
    return;
  }
  res.json(GetMyProfileResponse.parse(profile));
});

router.patch("/me", async (req, res): Promise<void> => {
  const parsed = UpdateMyProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { communityId, ...profileInput } = parsed.data;
  const userId = res.locals.memberId as string;
  const updates = Object.fromEntries(
    Object.entries(profileInput).filter(([, value]) => value !== undefined),
  );
  if (Object.keys(updates).length) {
    await db
      .update(membersTable)
      .set(updates)
      .where(eq(membersTable.id, userId));
  }

  if (communityId !== undefined) {
    if (communityId === null) {
      // Community changes remain explicit; this does not silently remove an
      // existing membership.
    } else {
      if (!isUuid(communityId)) {
        res.status(400).json({ error: "Choose a valid community." });
        return;
      }
      const [community] = await db
        .select()
        .from(communitiesTable)
        .where(eq(communitiesTable.id, communityId))
        .limit(1);
      if (!community) {
        res.status(400).json({ error: "Choose a community that exists." });
        return;
      }
      await db
        .insert(communityMembershipsTable)
        .values({ communityId, userId, status: "pending" })
        .onConflictDoNothing();
    }
  }

  const profile = await getProfile(userId);
  if (!profile) {
    res.status(404).json({ error: "Profile not found." });
    return;
  }
  res.json(UpdateMyProfileResponse.parse(profile));
});

router.get("/dashboard", async (_req, res): Promise<void> => {
  const userId = res.locals.memberId as string;
  const [profile, activities, incoming, unreadRows, recent] = await Promise.all([
      getProfile(userId),
      listActivities(userId),
      db
        .select({ value: count() })
        .from(connectionsTable)
        .where(
          and(
            eq(connectionsTable.recipientId, userId),
            eq(connectionsTable.status, "pending"),
          ),
        ),
      db
        .select({ value: count() })
        .from(notificationsTable)
        .where(
          and(
            eq(notificationsTable.userId, userId),
            eq(notificationsTable.isRead, false),
          ),
        ),
      db
        .select()
        .from(notificationsTable)
        .where(eq(notificationsTable.userId, userId))
        .orderBy(desc(notificationsTable.createdAt))
        .limit(5),
    ]);

  if (!profile) {
    res.status(404).json({ error: "Profile not found." });
    return;
  }

  const people = await listPeople(userId);
  const unreadCount = Number(unreadRows[0]?.value ?? 0);
  const upcomingActivities = activities
    .filter((activity) => activity.status === "open" || activity.status === "confirmed")
    .slice(0, 4);

  res.json(
    GetDashboardResponse.parse({
      profile,
      suggestedPeople: people.slice(0, 4),
      upcomingActivities,
      activitiesCount: activities.length,
      pendingRequestsCount: Number(incoming[0]?.value ?? 0),
      unreadNotificationsCount: unreadCount,
      recentNotifications: recent.map((notification) => ({
        ...notification,
        isRead: notification.isRead,
        createdAt: notification.createdAt.toISOString(),
      })),
    }),
  );
});

export default router;