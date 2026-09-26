export type Role = "owner" | "voter" | "eater";

/** Household actions. Absence of a vote is passive approve — do not store `approve`. */
export const VOTE_CHOICES = ["swap", "remove", "request_new_meal"] as const;
export type VoteChoice = (typeof VOTE_CHOICES)[number];

/** Night state after last-writer-wins. `proposed` is lock-ok like `passive`. */
export const NIGHT_LIFECYCLES = [
  "passive",
  "swapped",
  "removed",
  "request_new_meal",
  "proposed",
] as const;
export type NightLifecycle = (typeof NIGHT_LIFECYCLES)[number];

export type Audience = "couple" | "family";
export type WeekStatus = "voting" | "locked";

export type UserProfile = {
  id: string;
  email: string;
  displayName: string;
};

export type Store = {
  id: string;
  householdId: string;
  name: string;
  slug: string;
  sortOrder: number;
};

export type Membership = {
  id: string;
  householdId: string;
  userId: string;
  role: Role;
  displayName: string;
  email: string;
};

export const BALLOT_REQUEST_STATUSES = ["pending", "fulfilled", "cancelled"] as const;
export type BallotRequestStatus = (typeof BALLOT_REQUEST_STATUSES)[number];

export type Household = {
  id: string;
  name: string;
  inviteCode: string;
  weekStartsOn: number;
  coupleNights: number[];
  familySize: number;
  coupleSize: number;
  nightHeadcounts: number[];
  timezone: string;
  setupStep: number;
  weeklyBudgetCents: number | null;
  householdSize: number;
  nightsPlanned: number;
  postalCode: string | null;
};

export type BallotRequest = {
  id: string;
  householdId: string;
  weekId: string;
  status: BallotRequestStatus;
  householdSize: number;
  nightsPlanned: number;
  nightHeadcounts: number[];
  storeNames: string[];
  weeklyBudgetCents: number | null;
  postalCode: string | null;
  requestedBy: string | null;
  createdAt: string;
  updatedAt: string;
  fulfilledAt: string | null;
};

export type Ingredient = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  storeId: string;
};

export type Recipe = {
  id: string;
  mealId: string;
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  steps: string[];
  ingredients: Ingredient[];
};

export type Meal = {
  id: string;
  householdId: string;
  weekId: string;
  dayIndex: number;
  nightDate: string;
  title: string;
  pitch: string;
  audience: Audience;
  servings: number;
  prepMinutes: number;
  isLeftovers: boolean;
  leftoverOfMealId: string | null;
  estimatedCostCents: number | null;
  estimatedCostSource: string | null;
  estimatedCostAsOf: string | null;
};

export type Vote = {
  id: string;
  householdId: string;
  mealId: string;
  membershipId: string;
  choice: VoteChoice;
  note: string;
  updatedAt: string;
};

export type Week = {
  id: string;
  householdId: string;
  startsOn: string;
  status: WeekStatus;
  lockedAt: string | null;
};

export type ShoppingItem = {
  id: string;
  householdId: string;
  shoppingListId: string;
  storeId: string;
  name: string;
  quantity: number;
  unit: string;
  priceCents: number | null;
  priceSource: string | null;
  pricedAt: string | null;
  checked: boolean;
};

export type ShoppingList = {
  id: string;
  householdId: string;
  weekId: string;
  generatedAt: string;
  items: ShoppingItem[];
};

export type Session = {
  userId: string;
  email: string;
  displayName: string;
  membershipId: string | null;
  householdId: string | null;
  role: Role | null;
};

export type MealProposalInput = {
  title: string;
  pitch: string;
  prepMinutes: number;
  audience?: Audience;
  servings?: number;
  steps?: string[];
  ingredients?: Array<{
    name: string;
    quantity: number;
    unit: string;
    storeId: string;
  }>;
};

export type HouseholdSettingsPatch = {
  name?: string;
  weekStartsOn?: number;
  coupleNights?: number[];
  familySize?: number;
  coupleSize?: number;
  nightHeadcounts?: number[];
  setupStep?: number;
  weeklyBudgetCents?: number | null;
  householdSize?: number;
  nightsPlanned?: number;
  postalCode?: string | null;
};

export type PendingInvite = {
  id: string;
  householdId: string;
  displayName: string;
  email: string;
  role: Role;
};

export type HouseholdSnapshot = {
  household: Household;
  memberships: Membership[];
  stores: Store[];
  week: Week;
  meals: Meal[];
  votes: Vote[];
  recipes: Recipe[];
  shoppingList: ShoppingList | null;
  pendingInvites?: PendingInvite[];
  joinToken?: string | null;
  ballotRequest?: BallotRequest | null;
};

export type ReplacementIdea = {
  id: string;
  title: string;
  pitch: string;
  prepMinutes: number;
  audience: Audience;
  steps: string[];
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
    storeSlug: string;
  }>;
};
