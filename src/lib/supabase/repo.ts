import type {
  BallotRequest,
  HouseholdSettingsPatch,
  HouseholdSnapshot,
  Meal,
  MealProposalInput,
  Membership,
  PendingInvite,
  Recipe,
  Role,
  Session,
  ShoppingItem,
  ShoppingList,
  Store,
  Vote,
  VoteChoice,
  Week,
} from "@/lib/types";
import type { MemberDraft } from "@/lib/users";
import { voteNotePersists } from "@/lib/ballot";
import {
  clampHouseSetupStep,
  clampHouseholdSize,
  clampNightsPlanned,
  nightsPlannedFromHeadcounts,
  parseBallotRequestStatus,
} from "@/lib/house-setup";
import type { JoinPeek } from "@/lib/join";
import { parseJoinPeek } from "@/lib/join";
import { canActOnBallot, lastWriterWinsToast, latestVoteForMeal, migrateVoteChoice } from "@/lib/lock";
import { isAdmin } from "@/lib/users";
import {
  audienceFromHeadcount,
  coupleNightsFromHeadcounts,
  headcountForNight,
  normalizeNightHeadcounts,
} from "@/lib/headcount";
import { redactUntilLocked } from "@/lib/visibility";
import type { SupabaseClient } from "@supabase/supabase-js";

function mapBallotRequest(
  row: Record<string, unknown> | null | undefined,
  error: { message: string } | null,
  weekId: string,
): BallotRequest | null {
  if (error || !row || row.week_id !== weekId) return null;
  const status = parseBallotRequestStatus(row.status);
  if (!status) return null;
  return {
    id: String(row.id),
    householdId: String(row.household_id),
    weekId: String(row.week_id),
    status,
    householdSize: clampHouseholdSize(row.household_size),
    nightsPlanned: clampNightsPlanned(row.nights_planned),
    nightHeadcounts: normalizeNightHeadcounts(
      Array.isArray(row.night_headcounts) ? (row.night_headcounts as number[]) : null,
    ),
    storeNames: Array.isArray(row.store_names)
      ? (row.store_names as unknown[]).map((name) => String(name))
      : [],
    weeklyBudgetCents:
      typeof row.weekly_budget_cents === "number" ? row.weekly_budget_cents : null,
    postalCode:
      typeof row.postal_code === "string" && row.postal_code.trim() ? row.postal_code : null,
    requestedBy: typeof row.requested_by === "string" ? row.requested_by : null,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
    fulfilledAt: typeof row.fulfilled_at === "string" ? row.fulfilled_at : null,
  };
}

function required<T>(data: T | null, error: { message: string } | null, fallback: string): T {
  if (error) throw new Error(error.message);
  if (data == null) throw new Error(fallback);
  return data;
}

export async function fetchSupabaseSession(
  client: SupabaseClient,
): Promise<Session | null> {
  const { data: userData } = await client.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  await client.rpc("claim_pending_invites");

  const { data: membership, error: membershipError } = await client
    .from("memberships")
    .select("id, household_id, role, display_name, email")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (membershipError) throw new Error(membershipError.message);

  return {
    userId: user.id,
    email: user.email ?? membership?.email ?? "",
    displayName:
      membership?.display_name ||
      (user.user_metadata.display_name as string | undefined) ||
      user.email?.split("@")[0] ||
      "You",
    membershipId: membership?.id ?? null,
    householdId: membership?.household_id ?? null,
    role: membership?.role ?? null,
  };
}

export async function fetchSupabaseSnapshot(
  client: SupabaseClient,
  session: Session,
): Promise<HouseholdSnapshot | null> {
  if (!session.householdId) return null;

  const householdId = session.householdId;
  const [
    householdRes,
    membersRes,
    storesRes,
    weekRes,
    mealsRes,
    votesRes,
    recipesRes,
    ingredientsRes,
    listRes,
    invitesRes,
    joinTokenRes,
    ballotRequestRes,
  ] = await Promise.all([
    client.from("households").select("*").eq("id", householdId).single(),
    client.from("memberships").select("*").eq("household_id", householdId),
    client.from("household_stores").select("*").eq("household_id", householdId).order("sort_order"),
    client
      .from("weeks")
      .select("*")
      .eq("household_id", householdId)
      .order("starts_on", { ascending: false })
      .limit(1)
      .maybeSingle(),
    client.from("meals").select("*").eq("household_id", householdId),
    client.from("votes").select("*").eq("household_id", householdId),
    client.from("recipes").select("*").eq("household_id", householdId),
    client.from("recipe_ingredients").select("*").eq("household_id", householdId),
    client.from("shopping_lists").select("*").eq("household_id", householdId).maybeSingle(),
    client.from("household_invites").select("*").eq("household_id", householdId),
    client
      .from("household_join_tokens")
      .select("token")
      .eq("household_id", householdId)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    client
      .from("ballot_requests")
      .select("*")
      .eq("household_id", householdId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const householdRow = required(householdRes.data, householdRes.error, "Household not found");
  const weekRow = required(weekRes.data, weekRes.error, "This household has no week yet.");

  const meals: Meal[] = (mealsRes.data ?? [])
    .filter((row) => row.week_id === weekRow.id)
    .map((row) => ({
      id: row.id,
      householdId: row.household_id,
      weekId: row.week_id,
      dayIndex: row.day_index,
      nightDate: row.night_date,
      title: row.title,
      pitch: row.pitch,
      audience: row.audience,
      servings: row.servings,
      prepMinutes: row.prep_minutes,
      isLeftovers: row.is_leftovers,
      leftoverOfMealId: row.leftover_of_meal_id,
      estimatedCostCents: row.estimated_cost_cents,
      estimatedCostSource: row.estimated_cost_source,
      estimatedCostAsOf: row.estimated_cost_as_of,
    }))
    .sort((a, b) => a.dayIndex - b.dayIndex);

  const recipes: Recipe[] = (recipesRes.data ?? [])
    .filter((row) => meals.some((meal) => meal.id === row.meal_id))
    .map((row) => ({
      id: row.id,
      mealId: row.meal_id,
      servings: row.servings,
      prepMinutes: row.prep_minutes,
      cookMinutes: row.cook_minutes,
      steps: row.steps ?? [],
      ingredients: (ingredientsRes.data ?? [])
        .filter((ingredient) => ingredient.recipe_id === row.id)
        .map((ingredient) => ({
          id: ingredient.id,
          name: ingredient.name,
          quantity: Number(ingredient.quantity),
          unit: ingredient.unit,
          storeId: ingredient.store_id,
        })),
    }));

  const votes: Vote[] = (votesRes.data ?? [])
    .filter((row) => meals.some((meal) => meal.id === row.meal_id))
    .flatMap((row) => {
      const choice = migrateVoteChoice(row.choice);
      if (!choice) return [];
      return [{
        id: row.id,
        householdId: row.household_id,
        mealId: row.meal_id,
        membershipId: row.membership_id,
        choice,
        note: voteNotePersists(choice) ? (row.note ?? "") : "",
        updatedAt: row.updated_at,
      }];
    });

  const week: Week = {
    id: weekRow.id,
    householdId: weekRow.household_id,
    startsOn: weekRow.starts_on,
    status: weekRow.status,
    lockedAt: weekRow.locked_at,
  };

  let shoppingList: ShoppingList | null = null;
  if (listRes.data && listRes.data.week_id === week.id) {
    const itemsRes = await client
      .from("shopping_items")
      .select("*")
      .eq("shopping_list_id", listRes.data.id);
    shoppingList = {
      id: listRes.data.id,
      householdId: listRes.data.household_id,
      weekId: listRes.data.week_id,
      generatedAt: listRes.data.generated_at,
      items: (itemsRes.data ?? []).map(
        (row): ShoppingItem => ({
          id: row.id,
          householdId: row.household_id,
          shoppingListId: row.shopping_list_id,
          storeId: row.store_id,
          name: row.name,
          quantity: Number(row.quantity),
          unit: row.unit,
          priceCents: row.price_cents,
          priceSource: row.price_source,
          pricedAt: row.priced_at,
          checked: row.checked,
        }),
      ),
    };
  }

  const snapshot: HouseholdSnapshot = {
    household: {
      id: householdRow.id,
      name: householdRow.name,
      inviteCode: householdRow.invite_code,
      weekStartsOn: householdRow.week_starts_on,
      coupleNights: householdRow.couple_nights,
      familySize: householdRow.family_size,
      coupleSize: householdRow.couple_size,
      nightHeadcounts: normalizeNightHeadcounts(householdRow.night_headcounts, {
        coupleNights: householdRow.couple_nights,
        familySize: householdRow.family_size,
        coupleSize: householdRow.couple_size,
      }),
      timezone: householdRow.timezone,
      setupStep: clampHouseSetupStep(householdRow.setup_step ?? 8),
      weeklyBudgetCents:
        typeof householdRow.weekly_budget_cents === "number"
          ? householdRow.weekly_budget_cents
          : null,
      householdSize: clampHouseholdSize(householdRow.household_size ?? householdRow.family_size),
      nightsPlanned: clampNightsPlanned(
        householdRow.nights_planned ??
          nightsPlannedFromHeadcounts(householdRow.night_headcounts ?? []),
      ),
      postalCode:
        typeof householdRow.postal_code === "string" && householdRow.postal_code.trim()
          ? householdRow.postal_code
          : null,
    },
    memberships: (membersRes.data ?? []).map(
      (row): Membership => ({
        id: row.id,
        householdId: row.household_id,
        userId: row.user_id,
        role: row.role,
        displayName: row.display_name,
        email: row.email ?? "",
      }),
    ),
    stores: (storesRes.data ?? []).map(
      (row): Store => ({
        id: row.id,
        householdId: row.household_id,
        name: row.name,
        slug: row.slug,
        sortOrder: row.sort_order,
      }),
    ),
    week,
    meals,
    votes,
    recipes,
    shoppingList,
    pendingInvites: (invitesRes.data ?? []).map(
      (row): PendingInvite => ({
        id: row.id,
        householdId: row.household_id,
        displayName: row.display_name,
        email: row.email ?? "",
        role: row.role,
      }),
    ),
    joinToken: joinTokenRes.error ? null : (joinTokenRes.data?.token ?? null),
    ballotRequest: mapBallotRequest(ballotRequestRes.data, ballotRequestRes.error, week.id),
  };

  return redactUntilLocked(snapshot);
}

export async function supabaseSetVote(
  client: SupabaseClient,
  session: Session,
  mealId: string,
  choice: VoteChoice,
  note: string,
) {
  if (!session.membershipId || !session.householdId) throw new Error("Not in a household");
  if (!canActOnBallot(session.role)) throw new Error("Eaters can look, not change the ballot.");
  const { data: existingRows } = await client
    .from("votes")
    .select("id, household_id, meal_id, membership_id, choice, note, updated_at")
    .eq("meal_id", mealId);
  const previous = latestVoteForMeal(
    (existingRows ?? []).flatMap((row) => {
      const migrated = migrateVoteChoice(row.choice);
      if (!migrated) return [];
      return [{
        id: row.id,
        householdId: row.household_id,
        mealId: row.meal_id,
        membershipId: row.membership_id,
        choice: migrated,
        note: row.note ?? "",
        updatedAt: row.updated_at,
      }];
    }),
    mealId,
  );
  const { error } = await client.from("votes").upsert(
    {
      household_id: session.householdId,
      meal_id: mealId,
      membership_id: session.membershipId,
      choice,
      note: voteNotePersists(choice) ? note : "",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "meal_id,membership_id" },
  );
  if (error) throw new Error(error.message);
  return lastWriterWinsToast(previous, session.membershipId);
}

export async function supabaseProposeReplacement(
  client: SupabaseClient,
  session: Session,
  mealId: string,
  proposal: MealProposalInput,
) {
  if (!session.householdId) throw new Error("Not in a household");
  const { data: meal, error: mealError } = await client
    .from("meals")
    .select("*")
    .eq("id", mealId)
    .single();
  if (mealError || !meal) throw new Error(mealError?.message ?? "Meal not found");

  const { error: updateError } = await client
    .from("meals")
    .update({
      title: proposal.title,
      pitch: proposal.pitch,
      prep_minutes: proposal.prepMinutes,
      audience: proposal.audience ?? meal.audience,
      servings: proposal.servings ?? meal.servings,
      is_leftovers: false,
      leftover_of_meal_id: null,
    })
    .eq("id", mealId);
  if (updateError) throw new Error(updateError.message);

  await client.from("votes").delete().eq("meal_id", mealId);
  await client.from("recipes").delete().eq("meal_id", mealId);

  const { data: recipe, error: recipeError } = await client
    .from("recipes")
    .insert({
      household_id: session.householdId,
      meal_id: mealId,
      servings: proposal.servings ?? meal.servings,
      prep_minutes: Math.min(15, proposal.prepMinutes),
      cook_minutes: Math.max(0, proposal.prepMinutes - 15),
      steps: proposal.steps?.length ? proposal.steps : ["Cook and serve."],
    })
    .select("id")
    .single();
  if (recipeError || !recipe) throw new Error(recipeError?.message ?? "Could not save recipe");

  if (proposal.ingredients?.length) {
    const { error: ingError } = await client.from("recipe_ingredients").insert(
      proposal.ingredients.map((ingredient) => ({
        household_id: session.householdId,
        recipe_id: recipe.id,
        name: ingredient.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        store_id: ingredient.storeId,
      })),
    );
    if (ingError) throw new Error(ingError.message);
  }
}

export async function supabaseLockWeek(client: SupabaseClient) {
  const { error } = await client.rpc("lock_current_week");
  if (error) throw new Error(error.message);
}

export async function supabaseUnlockWeek(client: SupabaseClient, session: Session, weekId: string) {
  if (session.role !== "owner") throw new Error("Only an Admin can unlock the week.");
  const { error } = await client
    .from("weeks")
    .update({ status: "voting", locked_at: null })
    .eq("id", weekId);
  if (error) throw new Error(error.message);
  await client.from("shopping_lists").delete().eq("week_id", weekId);
}

export async function supabaseToggleItem(
  client: SupabaseClient,
  itemId: string,
  checked: boolean,
) {
  const { error } = await client.from("shopping_items").update({ checked }).eq("id", itemId);
  if (error) throw new Error(error.message);
}

export async function supabaseUpdateHousehold(
  client: SupabaseClient,
  session: Session,
  patch: HouseholdSettingsPatch,
) {
  if (session.role !== "owner" || !session.householdId) {
    throw new Error("Only an Admin can change household settings.");
  }
  const nightHeadcounts = patch.nightHeadcounts
    ? normalizeNightHeadcounts(patch.nightHeadcounts)
    : undefined;
  const coupleNights = nightHeadcounts
    ? coupleNightsFromHeadcounts(nightHeadcounts)
    : patch.coupleNights;

  const { error } = await client
    .from("households")
    .update({
      name: patch.name,
      week_starts_on: patch.weekStartsOn,
      couple_nights: coupleNights,
      family_size: patch.familySize,
      couple_size: patch.coupleSize,
      night_headcounts: nightHeadcounts,
      ...(patch.setupStep === undefined
        ? {}
        : { setup_step: clampHouseSetupStep(patch.setupStep) }),
      ...(patch.weeklyBudgetCents === undefined
        ? {}
        : { weekly_budget_cents: patch.weeklyBudgetCents }),
      ...(patch.householdSize === undefined
        ? {}
        : {
            household_size: clampHouseholdSize(patch.householdSize),
            family_size: clampHouseholdSize(patch.householdSize),
          }),
      ...(patch.nightsPlanned === undefined
        ? {}
        : { nights_planned: clampNightsPlanned(patch.nightsPlanned) }),
      ...(patch.postalCode === undefined ? {} : { postal_code: patch.postalCode }),
      ...(nightHeadcounts
        ? { nights_planned: nightsPlannedFromHeadcounts(nightHeadcounts) }
        : {}),
    })
    .eq("id", session.householdId);
  if (error) throw new Error(error.message);

  if (!nightHeadcounts && !patch.coupleNights) return;

  const { data: householdRow, error: householdError } = await client
    .from("households")
    .select("*")
    .eq("id", session.householdId)
    .single();
  if (householdError || !householdRow) return;

  const household = {
    nightHeadcounts: normalizeNightHeadcounts(householdRow.night_headcounts, {
      coupleNights: householdRow.couple_nights,
      familySize: householdRow.family_size,
      coupleSize: householdRow.couple_size,
    }),
    coupleNights: householdRow.couple_nights as number[],
    familySize: householdRow.family_size as number,
    coupleSize: householdRow.couple_size as number,
  };

  const { data: meals, error: mealsError } = await client
    .from("meals")
    .select("id, night_date")
    .eq("household_id", session.householdId);
  if (mealsError || !meals?.length) return;

  await Promise.all(
    meals.map((meal) => {
      const servings = headcountForNight(household, meal.night_date);
      return client
        .from("meals")
        .update({
          servings,
          audience: audienceFromHeadcount(servings),
        })
        .eq("id", meal.id);
    }),
  );
}

export async function supabaseJoinByCode(client: SupabaseClient, code: string) {
  const { error } = await client.rpc("join_household_by_code", { invite: code.trim() });
  if (error) throw new Error(error.message);
}

export const HOUSEHOLD_NOT_VISIBLE =
  "Household was created but this account cannot see it. Run the latest migrations, then refresh.";

export async function supabaseCreateHousehold(client: SupabaseClient, name: string) {
  const householdName = name.trim();
  if (!householdName) {
    throw new Error("Give the household a name.");
  }

  const { data, error } = await client.rpc("create_household", { household_name: householdName });
  if (error) throw new Error(error.message);
  if (data == null) throw new Error("Could not create a household.");

  const session = await fetchSupabaseSession(client);
  if (!session) throw new Error("Not signed in");
  if (!session.householdId) throw new Error(HOUSEHOLD_NOT_VISIBLE);
}

function requireAdmin(session: Session) {
  if (!isAdmin(session.role) || !session.householdId) {
    throw new Error("Only an Admin can manage people.");
  }
}

export async function supabaseInviteMember(
  client: SupabaseClient,
  session: Session,
  draft: MemberDraft,
) {
  requireAdmin(session);
  const { error } = await client.from("household_invites").insert({
    household_id: session.householdId,
    display_name: draft.displayName.trim(),
    email: draft.email.trim().toLowerCase(),
    role: draft.role,
  });
  if (error) throw new Error(error.message);
}

export async function supabaseSetMemberRole(
  client: SupabaseClient,
  session: Session,
  memberId: string,
  role: Role,
) {
  requireAdmin(session);
  const { error } = await client.rpc("set_member_role", {
    member_id: memberId,
    next_role: role,
  });
  if (error) throw new Error(error.message);
}

export async function supabaseRemoveMember(
  client: SupabaseClient,
  session: Session,
  memberId: string,
) {
  requireAdmin(session);
  const { error } = await client.rpc("remove_member", { member_id: memberId });
  if (error) throw new Error(error.message);
}

export async function supabaseRemoveInvite(
  client: SupabaseClient,
  session: Session,
  inviteId: string,
) {
  requireAdmin(session);
  const { error } = await client.from("household_invites").delete().eq("id", inviteId);
  if (error) throw new Error(error.message);
}

export async function supabasePeekJoinToken(
  client: SupabaseClient,
  token: string,
): Promise<JoinPeek> {
  const { data, error } = await client.rpc("peek_join_token", { join_token: token.trim() });
  if (error) throw new Error(error.message);
  return parseJoinPeek(data);
}

export async function supabaseClaimJoinToken(client: SupabaseClient, token: string) {
  const { error } = await client.rpc("claim_join_token", { join_token: token.trim() });
  if (error) throw new Error(error.message);
}

export async function supabaseCreateJoinToken(client: SupabaseClient, rotate = false) {
  const { data, error } = await client.rpc("create_join_token", { rotate });
  if (error) throw new Error(error.message);
  if (typeof data !== "string" || !data) throw new Error("Could not create an invite link.");
  return data;
}

export async function supabaseRequestWeekBallot(client: SupabaseClient) {
  const { data, error } = await client.rpc("request_week_ballot");
  if (error) throw new Error(error.message);
  if (typeof data !== "string" || !data) throw new Error("Could not create this week's meals request.");
  return data;
}
