import { and, count, desc, eq, ne } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  CreateActivityBody,
  CreateActivityResponse,
  GetActivityParams,
  GetActivityResponse,
  JoinActivityBody,
  JoinActivityParams,
  JoinActivityResponse,
  ListActivitiesQueryParams,
  ListActivitiesResponse,
} from "@workspace/api-zod";
import {
  activitiesTable,
  activityParticipantsTable,
  communityMembershipsTable,
  db,
} from "@workspace/db";
import {
  createNotification,
  getActivityById,
  isUuid,
  listActivities,
} from "../lib/milaap";

const router: IRouter = Router();

router.get("/activities", async (req, res): Promise<void> => {
  const parsed = ListActivitiesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const activities = await listActivities(
    res.locals.memberId as string,
    parsed.data,
  );
  res.json(ListActivitiesResponse.parse(activities));
});

router.post("/activities", async (req, res): Promise<void> => {
  const parsed = CreateActivityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const userId = res.locals.memberId as string;
  const input = parsed.data;
  if (input.communityId) {
    if (!isUuid(input.communityId)) {
      res.status(400).json({ error: "Choose a valid community." });
      return;
    }
    const [membership] = await db
      .select()
      .from(communityMembershipsTable)
      .where(
        and(
          eq(communityMembershipsTable.communityId, input.communityId),
          eq(communityMembershipsTable.userId, userId),
          eq(communityMembershipsTable.status, "approved"),
        ),
      )
      .limit(1);
    if (!membership) {
      res.status(403).json({ error: "Join the community before hosting an activity there." });
      return;
    }
  }

  const [created] = await db
    .insert(activitiesTable)
    .values({
      hostId: userId,
      communityId: input.communityId ?? null,
      title: input.title,
      description: input.description,
      category: input.category,
      durationMinutes: input.durationMinutes,
      format: input.format,
      accessibility: input.accessibility ?? null,
      materials: input.materials ?? null,
      meetingPoint: input.meetingPoint ?? null,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      capacity: input.format === "one-to-one" ? 1 : input.capacity,
    })
    .returning();
  const activity = await getActivityById(created.id, userId);
  if (!activity) {
    res.status(500).json({ error: "The activity was saved but could not be loaded." });
    return;
  }
  res.status(201).json(CreateActivityResponse.parse(activity));
});

router.get("/activities/:id", async (req, res): Promise<void> => {
  const params = GetActivityParams.safeParse(req.params);
  if (!params.success || !isUuid(params.data?.id ?? "")) {
    res.status(400).json({ error: "Choose a valid activity." });
    return;
  }
  const activity = await getActivityById(
    params.data.id,
    res.locals.memberId as string,
  );
  if (!activity) {
    res.status(404).json({ error: "Activity not found." });
    return;
  }
  res.json(GetActivityResponse.parse(activity));
});

router.post("/activities/:id/join", async (req, res): Promise<void> => {
  const params = JoinActivityParams.safeParse(req.params);
  const body = JoinActivityBody.safeParse(req.body ?? {});
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  if (!isUuid(params.data.id)) {
    res.status(400).json({ error: "Choose a valid activity." });
    return;
  }
  const userId = res.locals.memberId as string;
  const action = body.data.action ?? "request";
  const [activity] = await db
    .select()
    .from(activitiesTable)
    .where(eq(activitiesTable.id, params.data.id))
    .limit(1);
  if (!activity) {
    res.status(404).json({ error: "Activity not found." });
    return;
  }
  if (activity.status === "cancelled" || activity.status === "completed") {
    res.status(409).json({ error: "This activity is no longer accepting participants." });
    return;
  }

  if (action === "request") {
    if (activity.hostId === userId) {
      res.status(400).json({ error: "You are already hosting this activity." });
      return;
    }
    const [existing] = await db
      .select()
      .from(activityParticipantsTable)
      .where(
        and(
          eq(activityParticipantsTable.activityId, activity.id),
          eq(activityParticipantsTable.userId, userId),
        ),
      )
      .limit(1);
    if (existing && existing.status !== "cancelled") {
      const current = await getActivityById(activity.id, userId);
      res.json(JoinActivityResponse.parse(current));
      return;
    }
    const [participantCount] = await db
      .select({ value: count() })
      .from(activityParticipantsTable)
      .where(
        and(
          eq(activityParticipantsTable.activityId, activity.id),
          ne(activityParticipantsTable.status, "cancelled"),
        ),
      );
    const currentParticipantCount = Number(participantCount?.value ?? 0);
    if (
      (activity.format === "group" &&
        currentParticipantCount >= activity.capacity) ||
      (activity.format === "one-to-one" && currentParticipantCount >= 1)
    ) {
      res.status(409).json({ error: "This activity has reached capacity." });
      return;
    }
    const status = activity.format === "group" ? "confirmed" : "requested";
    if (existing) {
      await db
        .update(activityParticipantsTable)
        .set({ status })
        .where(eq(activityParticipantsTable.id, existing.id));
    } else {
      await db.insert(activityParticipantsTable).values({
        activityId: activity.id,
        userId,
        status,
      });
    }
    await createNotification(
      activity.hostId,
      activity.format === "group" ? "activity_joined" : "activity_request",
      activity.format === "group" ? "A member joined your activity" : "A member requested a meet-up",
      activity.title,
      `/activities/${activity.id}`,
    );
  } else if (action === "confirm") {
    if (activity.hostId !== userId) {
      res.status(403).json({ error: "Only the host can confirm a one-to-one request." });
      return;
    }
    const [requested] = await db
      .select()
      .from(activityParticipantsTable)
      .where(
        and(
          eq(activityParticipantsTable.activityId, activity.id),
          eq(activityParticipantsTable.status, "requested"),
        ),
      )
      .orderBy(desc(activityParticipantsTable.createdAt))
      .limit(1);
    if (!requested) {
      res.status(409).json({ error: "There is no pending participant request." });
      return;
    }
    await db
      .update(activityParticipantsTable)
      .set({ status: "confirmed" })
      .where(eq(activityParticipantsTable.id, requested.id));
    await createNotification(
      requested.userId,
      "activity_confirmed",
      "Your activity is confirmed",
      activity.title,
      `/activities/${activity.id}`,
    );
  } else if (action === "cancel") {
    if (activity.hostId === userId) {
      await db
        .update(activitiesTable)
        .set({ status: "cancelled" })
        .where(eq(activitiesTable.id, activity.id));
      const participants = await db
        .select({ userId: activityParticipantsTable.userId })
        .from(activityParticipantsTable)
        .where(
          and(
            eq(activityParticipantsTable.activityId, activity.id),
            ne(activityParticipantsTable.status, "cancelled"),
          ),
        );
      await Promise.all(
        participants.map(({ userId: participantId }) =>
          createNotification(
            participantId,
            "activity_cancelled",
            "An activity was cancelled",
            activity.title,
            "/activities",
          ),
        ),
      );
    } else {
      const cancelled = await db
        .update(activityParticipantsTable)
        .set({ status: "cancelled" })
        .where(
          and(
            eq(activityParticipantsTable.activityId, activity.id),
            eq(activityParticipantsTable.userId, userId),
          ),
        )
        .returning({ id: activityParticipantsTable.id });
      if (!cancelled.length) {
        res.status(409).json({ error: "You do not have a place in this activity." });
        return;
      }
      await createNotification(
        activity.hostId,
        "activity_update",
        "A member left your activity",
        activity.title,
        `/activities/${activity.id}`,
      );
    }
  }

  const updated = await getActivityById(
    activity.id,
    userId,
    action === "cancel" && activity.hostId === userId,
  );
  if (!updated) {
    res.status(404).json({ error: "Activity not found." });
    return;
  }
  res.json(JoinActivityResponse.parse(updated));
});

export default router;