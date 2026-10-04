import { eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  JoinCommunityParams,
  JoinCommunityResponse,
  ListCommunitiesQueryParams,
  ListCommunitiesResponse,
  ListPeopleQueryParams,
  ListPeopleResponse,
} from "@workspace/api-zod";
import {
  communityMembershipsTable,
  communitiesTable,
  db,
} from "@workspace/db";
import { isUuid, listCommunities, listPeople } from "../lib/milaap";

const router: IRouter = Router();

router.get("/people", async (req, res): Promise<void> => {
  const parsed = ListPeopleQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const people = await listPeople(res.locals.memberId as string, parsed.data);
  res.json(ListPeopleResponse.parse(people));
});

router.get("/communities", async (req, res): Promise<void> => {
  const parsed = ListCommunitiesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const communities = await listCommunities(
    res.locals.memberId as string,
    parsed.data.search,
  );
  res.json(ListCommunitiesResponse.parse(communities));
});

router.post("/communities/:id/join", async (req, res): Promise<void> => {
  const parsed = JoinCommunityParams.safeParse(req.params);
  if (!parsed.success || !isUuid(parsed.data?.id ?? "")) {
    res.status(400).json({ error: "Choose a valid community." });
    return;
  }
  const userId = res.locals.memberId as string;
  const [community] = await db
    .select()
    .from(communitiesTable)
    .where(eq(communitiesTable.id, parsed.data.id))
    .limit(1);
  if (!community) {
    res.status(404).json({ error: "Community not found." });
    return;
  }
  await db
    .insert(communityMembershipsTable)
    .values({
      communityId: community.id,
      userId,
      status: "pending",
    })
    .onConflictDoNothing();
  const communities = await listCommunities(userId);
  const updated = communities.find((entry) => entry.id === community.id);
  if (!updated) {
    res.status(500).json({ error: "Could not update community membership." });
    return;
  }
  res.json(JoinCommunityResponse.parse(updated));
});

export default router;