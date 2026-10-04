import {
  and,
  count,
  desc,
  eq,
  ilike,
  inArray,
  ne,
  or,
  type SQL,
} from "drizzle-orm";
import {
  activitiesTable,
  activityParticipantsTable,
  blocksTable,
  communitiesTable,
  communityMembershipsTable,
  connectionsTable,
  conversationMembersTable,
  conversationsTable,
  db,
  membersTable,
  notificationsTable,
  projectMembersTable,
  projectsTable,
  skillListingsTable,
} from "@workspace/db";

export const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );

export async function getProfile(userId: string) {
  const [member] = await db
    .select()
    .from(membersTable)
    .where(eq(membersTable.id, userId))
    .limit(1);
  if (!member) return null;

  const communities = await db
    .select({
      id: communitiesTable.id,
      name: communitiesTable.name,
      description: communitiesTable.description,
      type: communitiesTable.type,
      city: communitiesTable.city,
      guidelines: communitiesTable.guidelines,
      membershipStatus: communityMembershipsTable.status,
    })
    .from(communityMembershipsTable)
    .innerJoin(
      communitiesTable,
      eq(communityMembershipsTable.communityId, communitiesTable.id),
    )
    .where(eq(communityMembershipsTable.userId, userId));

  const communityDtos = await Promise.all(
    communities.map(async (community) => {
      const [memberCount] = await db
        .select({ value: count() })
        .from(communityMembershipsTable)
        .where(
          and(
            eq(communityMembershipsTable.communityId, community.id),
            eq(communityMembershipsTable.status, "approved"),
          ),
        );
      return {
        ...community,
        memberCount: Number(memberCount?.value ?? 0),
      };
    }),
  );

  return {
    id: member.id,
    displayName: member.displayName,
    email: member.email,
    bio: member.bio,
    ageRange: member.ageRange,
    city: member.city,
    locality: member.locality,
    language: member.language,
    interests: member.interests,
    skillsOffered: member.skillsOffered,
    skillsWanted: member.skillsWanted,
    availability: member.availability,
    preferredActivities: member.preferredActivities,
    profileVisibility: member.profileVisibility as "community" | "members" | "private",
    groupActivities: member.groupActivities,
    onboardingComplete: member.onboardingComplete,
    communities: communityDtos,
  };
}

function intersection<T>(left: T[], right: T[]): T[] {
  const rightSet = new Set(right.map((item) => String(item).toLowerCase()));
  return left.filter((item) => rightSet.has(String(item).toLowerCase()));
}

export async function listPeople(
  userId: string,
  filters: {
    search?: string;
    communityId?: string;
    skill?: string;
    interest?: string;
  } = {},
) {
  const [current] = await db
    .select()
    .from(membersTable)
    .where(eq(membersTable.id, userId))
    .limit(1);
  if (!current) return [];

  const allMembers = await db
    .select()
    .from(membersTable)
    .where(ne(membersTable.profileVisibility, "private"))
    .orderBy(membersTable.displayName)
    .limit(300);
  const memberships = await db
    .select({
      userId: communityMembershipsTable.userId,
      communityId: communityMembershipsTable.communityId,
      status: communityMembershipsTable.status,
      communityName: communitiesTable.name,
    })
    .from(communityMembershipsTable)
    .innerJoin(
      communitiesTable,
      eq(communityMembershipsTable.communityId, communitiesTable.id),
    )
    .where(eq(communityMembershipsTable.status, "approved"));

  const currentCommunities = new Set(
    memberships
      .filter((membership) => membership.userId === userId)
      .map((membership) => membership.communityId),
  );
  if (filters.communityId && !currentCommunities.has(filters.communityId)) {
    return [];
  }

  const relatedConnections = await db
    .select()
    .from(connectionsTable)
    .where(
      or(
        eq(connectionsTable.requesterId, userId),
        eq(connectionsTable.recipientId, userId),
      ),
    );
  const connectionByMember = new Map(
    relatedConnections.map((connection) => [
      connection.requesterId === userId
        ? connection.recipientId
        : connection.requesterId,
      connection.status,
    ]),
  );

  const blockedRows = await db
    .select()
    .from(blocksTable)
    .where(
      or(
        eq(blocksTable.blockerId, userId),
        eq(blocksTable.blockedId, userId),
      ),
    );
  const blocked = new Set(
    blockedRows.map((row) =>
      row.blockerId === userId ? row.blockedId : row.blockerId,
    ),
  );

  const search = filters.search?.trim().toLowerCase();
  const skill = filters.skill?.trim().toLowerCase();
  const interest = filters.interest?.trim().toLowerCase();

  return allMembers
    .filter((person) => person.id !== userId && !blocked.has(person.id))
    .map((person) => {
      const sharedInterests = intersection(current.interests, person.interests);
      const complementarySkills = [
        ...intersection(current.skillsOffered, person.skillsWanted),
        ...intersection(current.skillsWanted, person.skillsOffered),
      ].filter((skillName, index, all) => all.indexOf(skillName) === index);
      const commonActivities = intersection(
        current.preferredActivities,
        person.preferredActivities,
      );
      const commonAvailability = intersection(
        current.availability,
        person.availability,
      );
      const sharedCommunity = memberships.find(
        (membership) =>
          membership.userId === person.id &&
          currentCommunities.has(membership.communityId),
      );
      const sharedCommunityId = sharedCommunity?.communityId;

      const score = Math.min(
        100,
        Math.round(
          Math.min(35, (complementarySkills.length / 2) * 35) +
            Math.min(25, (sharedInterests.length / 3) * 25) +
            (commonActivities.length ? 15 : 0) +
            (commonAvailability.length ? 15 : 0) +
            (sharedCommunityId ? 10 : 0),
        ),
      );
      const reasons: string[] = [];
      if (complementarySkills.length) {
        reasons.push(`You can help each other with ${complementarySkills.slice(0, 2).join(" and ")}.`);
      }
      if (sharedInterests.length) {
        reasons.push(`You both enjoy ${sharedInterests.slice(0, 2).join(" and ")}.`);
      }
      if (commonActivities.length) {
        reasons.push(`You both prefer ${commonActivities[0]} activities.`);
      }
      if (commonAvailability.length) {
        reasons.push(`You are both available ${commonAvailability[0]}.`);
      }
      if (sharedCommunityId) reasons.push("You are part of the same community.");
      if (reasons.length === 0) reasons.push("A nearby community member you have not met yet.");

      return {
        id: person.id,
        displayName: person.displayName,
        bio: person.bio,
        ageRange: person.ageRange,
        city: person.city,
        locality: person.locality,
        interests: person.interests,
        skillsOffered: person.skillsOffered,
        skillsWanted: person.skillsWanted,
        availability: person.availability,
        preferredActivities: person.preferredActivities,
        communityName: sharedCommunity?.communityName ?? null,
        score,
        reasons,
        connectionStatus: connectionByMember.get(person.id) ?? null,
      };
    })
    .filter((person) => {
      const member = allMembers.find((candidate) => candidate.id === person.id);
      if (!member) return false;
      const shareCommunity = memberships.some(
        (membership) =>
          membership.userId === person.id &&
          currentCommunities.has(membership.communityId),
      );
      const sharesSelectedCommunity = memberships.some(
        (membership) =>
          membership.userId === person.id &&
          membership.communityId === filters.communityId,
      );
      if (member.profileVisibility === "community" && !shareCommunity) {
        return false;
      }
      if (filters.communityId && !sharesSelectedCommunity) return false;
      if (
        search &&
        !`${person.displayName} ${person.bio ?? ""} ${person.city ?? ""} ${person.locality ?? ""} ${person.interests.join(" ")} ${person.skillsOffered.join(" ")} ${person.skillsWanted.join(" ")}`
          .toLowerCase()
          .includes(search)
      ) {
        return false;
      }
      if (
        skill &&
        ![...person.skillsOffered, ...person.skillsWanted]
          .join(" ")
          .toLowerCase()
          .includes(skill)
      ) {
        return false;
      }
      if (
        interest &&
        !person.interests.join(" ").toLowerCase().includes(interest)
      ) {
        return false;
      }
      return true;
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 60);
}

export async function listActivities(
  userId: string,
  filters: {
    search?: string;
    category?: string;
    communityId?: string;
    id?: string;
  } = {},
  includeCancelled = false,
) {
  const where: SQL[] = [];
  if (!includeCancelled) {
    where.push(ne(activitiesTable.status, "cancelled"));
  }
  if (filters.id && isUuid(filters.id)) {
    where.push(eq(activitiesTable.id, filters.id));
  }
  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    where.push(
      or(
        ilike(activitiesTable.title, term),
        ilike(activitiesTable.description, term),
        ilike(activitiesTable.category, term),
      )!,
    );
  }
  if (filters.category?.trim()) {
    where.push(eq(activitiesTable.category, filters.category.trim()));
  }
  if (filters.communityId && isUuid(filters.communityId)) {
    where.push(eq(activitiesTable.communityId, filters.communityId));
  }

  const rows = await db
    .select({
      activity: activitiesTable,
      hostName: membersTable.displayName,
      communityName: communitiesTable.name,
    })
    .from(activitiesTable)
    .innerJoin(membersTable, eq(activitiesTable.hostId, membersTable.id))
    .leftJoin(
      communitiesTable,
      eq(activitiesTable.communityId, communitiesTable.id),
    )
    .where(and(...where))
    .orderBy(activitiesTable.scheduledAt, desc(activitiesTable.createdAt))
    .limit(100);
  if (!rows.length) return [];

  const ids = rows.map(({ activity }) => activity.id);
  const [participants, pendingRequests, mine] = await Promise.all([
    db
      .select({
        activityId: activityParticipantsTable.activityId,
        value: count(),
      })
      .from(activityParticipantsTable)
      .where(
        and(
          inArray(activityParticipantsTable.activityId, ids),
          ne(activityParticipantsTable.status, "cancelled"),
        ),
      )
      .groupBy(activityParticipantsTable.activityId),
    db
      .select({
        activityId: activityParticipantsTable.activityId,
        value: count(),
      })
      .from(activityParticipantsTable)
      .where(
        and(
          inArray(activityParticipantsTable.activityId, ids),
          eq(activityParticipantsTable.status, "requested"),
        ),
      )
      .groupBy(activityParticipantsTable.activityId),
    db
      .select()
      .from(activityParticipantsTable)
      .where(
        and(
          inArray(activityParticipantsTable.activityId, ids),
          eq(activityParticipantsTable.userId, userId),
        ),
      ),
  ]);
  const countByActivity = new Map(
    participants.map((participant) => [
      participant.activityId,
      Number(participant.value),
    ]),
  );
  const pendingByActivity = new Map(
    pendingRequests.map((participant) => [
      participant.activityId,
      Number(participant.value),
    ]),
  );
  const myStatus = new Map(
    mine.map((participant) => [participant.activityId, participant.status]),
  );
  return rows.map(({ activity, hostName, communityName }) => ({
    id: activity.id,
    title: activity.title,
    description: activity.description,
    category: activity.category,
    durationMinutes: activity.durationMinutes,
    format: activity.format as "one-to-one" | "group",
    accessibility: activity.accessibility,
    materials: activity.materials,
    meetingPoint: activity.meetingPoint,
    scheduledAt: activity.scheduledAt?.toISOString() ?? null,
    capacity: activity.format === "one-to-one" ? 1 : activity.capacity,
    participantCount: countByActivity.get(activity.id) ?? 0,
    pendingRequestCount: pendingByActivity.get(activity.id) ?? 0,
    hostId: activity.hostId,
    hostName,
    communityId: activity.communityId,
    communityName,
    status: activity.status as "open" | "requested" | "confirmed" | "completed" | "cancelled",
    participationStatus: myStatus.get(activity.id) ?? null,
  }));
}

export async function listSkills(
  search?: string,
  type?: "offer" | "request",
) {
  const where: SQL[] = [eq(skillListingsTable.status, "active")];
  if (type) where.push(eq(skillListingsTable.type, type));
  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    where.push(
      or(
        ilike(skillListingsTable.skill, term),
        ilike(skillListingsTable.description, term),
      )!,
    );
  }
  const rows = await db
    .select({
      listing: skillListingsTable,
      displayName: membersTable.displayName,
    })
    .from(skillListingsTable)
    .innerJoin(membersTable, eq(skillListingsTable.userId, membersTable.id))
    .where(and(...where))
    .orderBy(desc(skillListingsTable.createdAt))
    .limit(100);
  return Promise.all(
    rows.map(async ({ listing, displayName }) => {
      const [community] = await db
        .select({ name: communitiesTable.name })
        .from(communityMembershipsTable)
        .innerJoin(
          communitiesTable,
          eq(communityMembershipsTable.communityId, communitiesTable.id),
        )
        .where(
          and(
            eq(communityMembershipsTable.userId, listing.userId),
            eq(communityMembershipsTable.status, "approved"),
          ),
        )
        .limit(1);
      return {
        id: listing.id,
        userId: listing.userId,
        displayName,
        skill: listing.skill,
        type: listing.type as "offer" | "request",
        description: listing.description,
        experienceLevel: listing.experienceLevel,
        format: listing.format,
        availability: listing.availability,
        communityName: community?.name ?? null,
        createdAt: listing.createdAt.toISOString(),
      };
    }),
  );
}

export async function listProjects(
  userId: string,
  filters: { search?: string; category?: string } = {},
) {
  const where: SQL[] = [];
  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    where.push(
      or(
        ilike(projectsTable.title, term),
        ilike(projectsTable.description, term),
      )!,
    );
  }
  if (filters.category?.trim()) {
    where.push(eq(projectsTable.category, filters.category.trim()));
  }
  const rows = await db
    .select({
      project: projectsTable,
      ownerName: membersTable.displayName,
      communityName: communitiesTable.name,
    })
    .from(projectsTable)
    .innerJoin(membersTable, eq(projectsTable.ownerId, membersTable.id))
    .leftJoin(
      communitiesTable,
      eq(projectsTable.communityId, communitiesTable.id),
    )
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(projectsTable.createdAt))
    .limit(100);
  if (!rows.length) return [];
  const ids = rows.map(({ project }) => project.id);
  const [volunteerRows, mine] = await Promise.all([
    db
      .select({ projectId: projectMembersTable.projectId, value: count() })
      .from(projectMembersTable)
      .where(inArray(projectMembersTable.projectId, ids))
      .groupBy(projectMembersTable.projectId),
    db
      .select({ projectId: projectMembersTable.projectId })
      .from(projectMembersTable)
      .where(
        and(
          inArray(projectMembersTable.projectId, ids),
          eq(projectMembersTable.userId, userId),
        ),
      ),
  ]);
  const countByProject = new Map(
    volunteerRows.map((entry) => [entry.projectId, Number(entry.value)]),
  );
  const joined = new Set(mine.map((entry) => entry.projectId));
  return rows.map(({ project, ownerName, communityName }) => ({
    id: project.id,
    title: project.title,
    description: project.description,
    category: project.category,
    status: project.status as "proposed" | "planning" | "in-progress" | "completed",
    communityId: project.communityId,
    communityName,
    ownerId: project.ownerId,
    ownerName,
    volunteerCount: countByProject.get(project.id) ?? 0,
    targetDate: project.targetDate,
    joined: joined.has(project.id),
  }));
}

export async function listCommunities(userId: string, search?: string) {
  const where = search?.trim()
    ? or(
        ilike(communitiesTable.name, `%${search.trim()}%`),
        ilike(communitiesTable.description, `%${search.trim()}%`),
      )
    : undefined;
  const communities = await db
    .select()
    .from(communitiesTable)
    .where(where)
    .orderBy(communitiesTable.name)
    .limit(100);
  const memberships = await db
    .select()
    .from(communityMembershipsTable)
    .where(eq(communityMembershipsTable.userId, userId));
  const membershipById = new Map(
    memberships.map((membership) => [
      membership.communityId,
      membership.status,
    ]),
  );
  return Promise.all(
    communities.map(async (community) => {
      const [members] = await db
        .select({ value: count() })
        .from(communityMembershipsTable)
        .where(
          and(
            eq(communityMembershipsTable.communityId, community.id),
            eq(communityMembershipsTable.status, "approved"),
          ),
        );
      return {
        id: community.id,
        name: community.name,
        description: community.description,
        type: community.type,
        city: community.city,
        memberCount: Number(members?.value ?? 0),
        membershipStatus: membershipById.get(community.id) ?? null,
        guidelines: community.guidelines,
      };
    }),
  );
}

export async function createNotification(
  userId: string,
  kind: string,
  title: string,
  description: string,
  href?: string | null,
) {
  const [notification] = await db
    .insert(notificationsTable)
    .values({ userId, kind, title, description, href: href ?? null })
    .returning();
  return notification;
}

export async function ensureConversation(connectionId: string) {
  const [created] = await db
    .insert(conversationsTable)
    .values({ connectionId })
    .onConflictDoNothing({ target: conversationsTable.connectionId })
    .returning();
  const [conversation] = created
    ? [created]
    : await db
        .select()
        .from(conversationsTable)
        .where(eq(conversationsTable.connectionId, connectionId))
        .limit(1);
  if (!conversation) return null;
  const [connection] = await db
    .select()
    .from(connectionsTable)
    .where(eq(connectionsTable.id, connectionId))
    .limit(1);
  if (!connection) return null;
  await db
    .insert(conversationMembersTable)
    .values([
      { conversationId: conversation.id, userId: connection.requesterId },
      { conversationId: conversation.id, userId: connection.recipientId },
    ])
    .onConflictDoNothing();
  return conversation;
}

export async function getActivityById(
  id: string,
  userId: string,
  includeCancelled = false,
) {
  if (!isUuid(id)) return null;
  const activities = await listActivities(userId, { id }, includeCancelled);
  return activities.find((activity) => activity.id === id) ?? null;
}