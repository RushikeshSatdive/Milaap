import { db } from "@workspace/db";
import {
  activitiesTable,
  communityMembershipsTable,
  communitiesTable,
  membersTable,
  projectsTable,
  skillListingsTable,
} from "@workspace/db";

const demoCommunityId = "00000000-0000-4000-8000-000000000001";

const demoMembers = [
  {
    id: "demo-priya",
    displayName: "Priya",
    email: "",
    bio: "I love sharing family recipes and would like to get better at taking photos.",
    ageRange: "25–34",
    city: "Pune",
    locality: "Aundh",
    language: "English",
    interests: ["Cooking", "Music", "Gardening"],
    skillsOffered: ["Traditional cooking"],
    skillsWanted: ["Smartphone photography"],
    availability: ["Weekends", "Evenings"],
    preferredActivities: ["Skill swap", "Chai & chat"],
    profileVisibility: "members",
    groupActivities: true,
    onboardingComplete: true,
  },
  {
    id: "demo-rajesh",
    displayName: "Rajesh",
    email: "",
    bio: "Happy to teach basic car care and learn more about digital tools.",
    ageRange: "45–54",
    city: "Pune",
    locality: "Aundh",
    language: "Hindi",
    interests: ["Technology", "Local culture", "Walking"],
    skillsOffered: ["Basic car care"],
    skillsWanted: ["Digital payments"],
    availability: ["Weekends", "Mornings"],
    preferredActivities: ["Skill swap", "Community walk"],
    profileVisibility: "members",
    groupActivities: true,
    onboardingComplete: true,
  },
  {
    id: "demo-aarav",
    displayName: "Aarav",
    email: "",
    bio: "I can help with spreadsheets or photography, and I want to learn to cook.",
    ageRange: "18–24",
    city: "Pune",
    locality: "Aundh",
    language: "English",
    interests: ["Technology", "Cooking", "Photography"],
    skillsOffered: ["Excel", "Smartphone photography"],
    skillsWanted: ["Traditional cooking"],
    availability: ["Weekends", "Evenings"],
    preferredActivities: ["Skill swap", "Chai & chat"],
    profileVisibility: "members",
    groupActivities: true,
    onboardingComplete: true,
  },
  {
    id: "demo-meera",
    displayName: "Meera",
    email: "",
    bio: "Looking for relaxed ways to practise English and meet neighbours.",
    ageRange: "55–64",
    city: "Pune",
    locality: "Aundh",
    language: "Marathi",
    interests: ["Books", "Walking", "Local culture"],
    skillsOffered: ["Storytelling"],
    skillsWanted: ["Spoken English"],
    availability: ["Mornings", "Weekends"],
    preferredActivities: ["Community walk", "Language practice"],
    profileVisibility: "members",
    groupActivities: true,
    onboardingComplete: true,
  },
  {
    id: "demo-fatima",
    displayName: "Fatima",
    email: "",
    bio: "I enjoy sewing and making time for local volunteering.",
    ageRange: "35–44",
    city: "Pune",
    locality: "Aundh",
    language: "Urdu",
    interests: ["Art", "Volunteering", "Gardening"],
    skillsOffered: ["Sewing"],
    skillsWanted: ["Gardening"],
    availability: ["Weekends", "Afternoons"],
    preferredActivities: ["Volunteer together", "Recipe exchange"],
    profileVisibility: "members",
    groupActivities: true,
    onboardingComplete: true,
  },
];

export async function seedDemoData(): Promise<void> {
  await db
    .insert(communitiesTable)
    .values({
      id: demoCommunityId,
      name: "Demo · Pune Neighbourhood Circle",
      description: "Sample community for exploring Milaap. All seeded activity and member records are fictional demo data.",
      type: "neighbourhood",
      city: "Pune",
      guidelines:
        "Be kind, respect privacy, and choose public or organised community spaces for first meetings. This is a fictional demo community.",
    })
    .onConflictDoNothing({ target: communitiesTable.id });

  await db
    .insert(membersTable)
    .values(demoMembers)
    .onConflictDoNothing({ target: membersTable.id });

  await db
    .insert(communityMembershipsTable)
    .values(
      demoMembers.map((member) => ({
        userId: member.id,
        communityId: demoCommunityId,
        status: "approved",
      })),
    )
    .onConflictDoNothing();

  await db
    .insert(skillListingsTable)
    .values([
      {
        id: "00000000-0000-4000-8000-000000000101",
        userId: "demo-priya",
        skill: "Traditional cooking",
        type: "offer",
        description: "Learn a few easy family recipes together.",
        experienceLevel: "Experienced",
        format: "In person",
        availability: "Weekends",
      },
      {
        id: "00000000-0000-4000-8000-000000000102",
        userId: "demo-priya",
        skill: "Smartphone photography",
        type: "request",
        description: "I want to take better everyday photos on my phone.",
        experienceLevel: "Beginner",
        format: "In person",
        availability: "Evenings",
      },
      {
        id: "00000000-0000-4000-8000-000000000103",
        userId: "demo-aarav",
        skill: "Excel basics",
        type: "offer",
        description: "Friendly introduction to formulas, sorting, and simple budgets.",
        experienceLevel: "Experienced",
        format: "In person or online",
        availability: "Weekends",
      },
      {
        id: "00000000-0000-4000-8000-000000000104",
        userId: "demo-rajesh",
        skill: "Digital payments",
        type: "request",
        description: "Looking for a patient introduction to safe digital payments.",
        experienceLevel: "Beginner",
        format: "In person",
        availability: "Mornings",
      },
      {
        id: "00000000-0000-4000-8000-000000000105",
        userId: "demo-fatima",
        skill: "Sewing",
        type: "offer",
        description: "Learn a few useful repairs and simple hand-stitching.",
        experienceLevel: "Experienced",
        format: "In person",
        availability: "Weekends",
      },
      {
        id: "00000000-0000-4000-8000-000000000106",
        userId: "demo-meera",
        skill: "Spoken English",
        type: "request",
        description: "Practice everyday English conversation at a comfortable pace.",
        experienceLevel: "Beginner",
        format: "In person",
        availability: "Mornings",
      },
    ])
    .onConflictDoNothing({ target: skillListingsTable.id });

  await db
    .insert(activitiesTable)
    .values([
      {
        id: "00000000-0000-4000-8000-000000000201",
        hostId: "demo-priya",
        communityId: demoCommunityId,
        title: "Demo: Chai & Chat",
        description: "A relaxed 20-minute hello with neighbours at the community garden.",
        category: "Conversation",
        durationMinutes: 20,
        format: "group",
        accessibility: "Step-free seating area nearby.",
        materials: "Bring your own chai or water.",
        meetingPoint: "Community garden seating",
        scheduledAt: new Date("2026-11-14T10:00:00+05:30"),
        capacity: 8,
      },
      {
        id: "00000000-0000-4000-8000-000000000202",
        hostId: "demo-aarav",
        communityId: demoCommunityId,
        title: "Demo: Smartphone Photo Walk",
        description: "Share a few simple phone photography tips on a short, easy walk.",
        category: "Skill swap",
        durationMinutes: 20,
        format: "group",
        accessibility: "Flat walking route; benches available.",
        materials: "Bring a phone with a camera.",
        meetingPoint: "Aundh community library entrance",
        scheduledAt: new Date("2026-11-15T08:30:00+05:30"),
        capacity: 6,
      },
      {
        id: "00000000-0000-4000-8000-000000000203",
        hostId: "demo-meera",
        communityId: demoCommunityId,
        title: "Demo: Neighbourhood Story Walk",
        description: "Take a gentle walk and trade favourite local stories.",
        category: "Community walk",
        durationMinutes: 30,
        format: "group",
        accessibility: "Choose a short route and pause whenever needed.",
        meetingPoint: "Public library courtyard",
        scheduledAt: new Date("2026-11-16T09:00:00+05:30"),
        capacity: 10,
      },
      {
        id: "00000000-0000-4000-8000-000000000204",
        hostId: "demo-fatima",
        communityId: demoCommunityId,
        title: "Demo: Repair & Share",
        description: "Bring a small clothing repair and learn a useful stitch together.",
        category: "Skill swap",
        durationMinutes: 20,
        format: "group",
        materials: "Needle and thread can be shared.",
        meetingPoint: "Community hall",
        scheduledAt: new Date("2026-11-21T15:00:00+05:30"),
        capacity: 6,
      },
    ])
    .onConflictDoNothing({ target: activitiesTable.id });

  await db
    .insert(projectsTable)
    .values([
      {
        id: "00000000-0000-4000-8000-000000000301",
        ownerId: "demo-fatima",
        communityId: demoCommunityId,
        title: "Demo: Start a shared book corner",
        description: "Find a suitable shelf, invite neighbours to donate books, and agree on simple borrowing guidelines.",
        category: "Community space",
        status: "planning",
        targetDate: "2026-12-01",
      },
      {
        id: "00000000-0000-4000-8000-000000000302",
        ownerId: "demo-rajesh",
        communityId: demoCommunityId,
        title: "Demo: Digital help hour",
        description: "Host a patient, small-group session to practise everyday digital services safely.",
        category: "Learning",
        status: "proposed",
        targetDate: "2026-12-15",
      },
      {
        id: "00000000-0000-4000-8000-000000000303",
        ownerId: "demo-meera",
        communityId: demoCommunityId,
        title: "Demo: Neighbourhood garden day",
        description: "Bring residents together to plan a small planting day in a shared space.",
        category: "Environment",
        status: "in-progress",
        targetDate: "2026-11-29",
      },
    ])
    .onConflictDoNothing({ target: projectsTable.id });
}