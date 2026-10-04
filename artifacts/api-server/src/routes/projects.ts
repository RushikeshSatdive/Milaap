import { and, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  CreateProjectBody,
  CreateProjectResponse,
  JoinProjectParams,
  JoinProjectResponse,
  ListProjectsQueryParams,
  ListProjectsResponse,
} from "@workspace/api-zod";
import {
  communityMembershipsTable,
  db,
  projectMembersTable,
  projectsTable,
} from "@workspace/db";
import { createNotification, isUuid, listProjects } from "../lib/milaap";

const router: IRouter = Router();

router.get("/projects", async (req, res): Promise<void> => {
  const parsed = ListProjectsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const projects = await listProjects(res.locals.memberId as string, parsed.data);
  res.json(ListProjectsResponse.parse(projects));
});

router.post("/projects", async (req, res): Promise<void> => {
  const parsed = CreateProjectBody.safeParse(req.body);
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
      res.status(403).json({ error: "Join the community before proposing a project there." });
      return;
    }
  }
  const [created] = await db
    .insert(projectsTable)
    .values({
      ownerId: userId,
      communityId: input.communityId ?? null,
      title: input.title,
      description: input.description,
      category: input.category,
      targetDate: input.targetDate
        ? input.targetDate.toISOString().slice(0, 10)
        : null,
    })
    .returning();
  const projects = await listProjects(userId);
  const project = projects.find((candidate) => candidate.id === created.id);
  if (!project) {
    res.status(500).json({ error: "The project was saved but could not be loaded." });
    return;
  }
  res.status(201).json(CreateProjectResponse.parse(project));
});

router.post("/projects/:id/join", async (req, res): Promise<void> => {
  const params = JoinProjectParams.safeParse(req.params);
  if (!params.success || !isUuid(params.data?.id ?? "")) {
    res.status(400).json({ error: "Choose a valid community project." });
    return;
  }
  const userId = res.locals.memberId as string;
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.id))
    .limit(1);
  if (!project) {
    res.status(404).json({ error: "Community project not found." });
    return;
  }
  if (project.status === "completed") {
    res.status(409).json({ error: "This project is already complete." });
    return;
  }
  await db
    .insert(projectMembersTable)
    .values({ projectId: project.id, userId })
    .onConflictDoNothing();
  if (project.ownerId !== userId) {
    await createNotification(
      project.ownerId,
      "project_volunteer",
      "A member volunteered to help",
      project.title,
      "/community-board",
    );
  }
  const projects = await listProjects(userId);
  const updated = projects.find((candidate) => candidate.id === project.id);
  if (!updated) {
    res.status(500).json({ error: "The project membership was saved but could not be loaded." });
    return;
  }
  res.json(JoinProjectResponse.parse(updated));
});

export default router;