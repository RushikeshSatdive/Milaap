import { and, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  CreateSkillBody,
  CreateSkillResponse,
  DeleteSkillParams,
  ListSkillsQueryParams,
  ListSkillsResponse,
  UpdateSkillBody,
  UpdateSkillParams,
  UpdateSkillResponse,
} from "@workspace/api-zod";
import { db, skillListingsTable } from "@workspace/db";
import { isUuid, listSkills } from "../lib/milaap";

const router: IRouter = Router();

router.get("/skills", async (req, res): Promise<void> => {
  const parsed = ListSkillsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const listings = await listSkills(parsed.data.search, parsed.data.type);
  res.json(ListSkillsResponse.parse(listings));
});

router.post("/skills", async (req, res): Promise<void> => {
  const parsed = CreateSkillBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [created] = await db
    .insert(skillListingsTable)
    .values({ userId: res.locals.memberId as string, ...parsed.data })
    .returning();
  const listings = await listSkills();
  const listing = listings.find((candidate) => candidate.id === created.id);
  if (!listing) {
    res.status(500).json({ error: "The skill listing was saved but could not be loaded." });
    return;
  }
  res.status(201).json(CreateSkillResponse.parse(listing));
});

router.patch("/skills/:id", async (req, res): Promise<void> => {
  const params = UpdateSkillParams.safeParse(req.params);
  const body = UpdateSkillBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  if (!isUuid(params.data.id)) {
    res.status(400).json({ error: "Choose a valid skill listing." });
    return;
  }
  const userId = res.locals.memberId as string;
  const [updated] = await db
    .update(skillListingsTable)
    .set(body.data)
    .where(
      and(
        eq(skillListingsTable.id, params.data.id),
        eq(skillListingsTable.userId, userId),
      ),
    )
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Skill listing not found." });
    return;
  }
  const listings = await listSkills();
  const listing = listings.find((candidate) => candidate.id === updated.id);
  if (!listing) {
    res.status(500).json({ error: "The skill listing was updated but could not be loaded." });
    return;
  }
  res.json(UpdateSkillResponse.parse(listing));
});

router.delete("/skills/:id", async (req, res): Promise<void> => {
  const params = DeleteSkillParams.safeParse(req.params);
  if (!params.success || !isUuid(params.data?.id ?? "")) {
    res.status(400).json({ error: "Choose a valid skill listing." });
    return;
  }
  const deleted = await db
    .delete(skillListingsTable)
    .where(
      and(
        eq(skillListingsTable.id, params.data.id),
        eq(skillListingsTable.userId, res.locals.memberId as string),
      ),
    )
    .returning({ id: skillListingsTable.id });
  if (!deleted.length) {
    res.status(404).json({ error: "Skill listing not found." });
    return;
  }
  res.sendStatus(204);
});

export default router;