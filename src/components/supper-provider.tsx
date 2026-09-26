"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured } from "@/lib/config";
import { REPLACEMENT_IDEAS } from "@/lib/ideas";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  fetchSupabaseSession,
  fetchSupabaseSnapshot,
  supabaseClaimJoinToken,
  supabaseCreateHousehold,
  supabaseCreateJoinToken,
  supabaseInviteMember,
  supabaseJoinByCode,
  supabaseLockWeek,
  supabasePeekJoinToken,
  supabaseProposeReplacement,
  supabaseRemoveInvite,
  supabaseRemoveMember,
  supabaseRequestWeekBallot,
  supabaseSetMemberRole,
  supabaseSetVote,
  supabaseToggleItem,
  supabaseUnlockWeek,
  supabaseUpdateHousehold,
} from "@/lib/supabase/repo";
import type { JoinPeek } from "@/lib/join";
import { safeAuthNext } from "@/lib/login";
import type {
  HouseholdSettingsPatch,
  HouseholdSnapshot,
  MealProposalInput,
  Role,
  Session,
  VoteChoice,
} from "@/lib/types";
import type { MemberDraft } from "@/lib/users";

const SETUP_REQUIRED = "This install is not connected to Supabase yet. Finish setup first.";

type SupperContextValue = {
  ready: boolean;
  mode: "setup" | "supabase";
  session: Session | null;
  snapshot: HouseholdSnapshot | null;
  error: string | null;
  refresh: () => Promise<void>;
  signInMagicLink: (email: string, options?: { next?: string }) => Promise<void>;
  bootstrapHousehold: (input: {
    householdName: string;
    displayName: string;
    email: string;
  }) => Promise<void>;
  addMember: (draft: MemberDraft) => Promise<void>;
  updateMemberRole: (memberId: string, role: Role) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  removeInvite: (inviteId: string) => Promise<void>;
  signOut: () => Promise<void>;
  setVote: (mealId: string, choice: VoteChoice, note?: string) => Promise<string | undefined>;
  proposeReplacement: (mealId: string, proposal: MealProposalInput) => Promise<void>;
  applyIdea: (mealId: string, ideaId: string) => Promise<void>;
  markLeftovers: (mealId: string, sourceMealId: string) => Promise<void>;
  lockWeek: () => Promise<void>;
  unlockWeek: () => Promise<void>;
  toggleItem: (itemId: string, checked: boolean) => Promise<void>;
  updateHousehold: (patch: HouseholdSettingsPatch) => Promise<void>;
  addStore: (name: string) => Promise<void>;
  removeStore: (storeId: string) => Promise<void>;
  createHousehold: (name: string) => Promise<void>;
  joinHousehold: (code: string, email?: string) => Promise<void>;
  peekJoinToken: (token: string) => Promise<JoinPeek>;
  claimJoinToken: (token: string) => Promise<void>;
  createJoinToken: (rotate?: boolean) => Promise<string>;
  requestWeekBallot: () => Promise<string>;
};

const SupperContext = createContext<SupperContextValue | null>(null);

export function useSupper() {
  const value = useContext(SupperContext);
  if (!value) throw new Error("useSupper must be used inside SupperProvider");
  return value;
}

function setupUnavailable(): never {
  throw new Error(SETUP_REQUIRED);
}

function createSetupContext(): SupperContextValue {
  return {
    ready: true,
    mode: "setup",
    session: null,
    snapshot: null,
    error: null,
    refresh: async () => {},
    signInMagicLink: async () => setupUnavailable(),
    bootstrapHousehold: async () => setupUnavailable(),
    addMember: async () => setupUnavailable(),
    updateMemberRole: async () => setupUnavailable(),
    removeMember: async () => setupUnavailable(),
    removeInvite: async () => setupUnavailable(),
    signOut: async () => {},
    setVote: async () => setupUnavailable(),
    proposeReplacement: async () => setupUnavailable(),
    applyIdea: async () => setupUnavailable(),
    markLeftovers: async () => setupUnavailable(),
    lockWeek: async () => setupUnavailable(),
    unlockWeek: async () => setupUnavailable(),
    toggleItem: async () => setupUnavailable(),
    updateHousehold: async () => setupUnavailable(),
    addStore: async () => setupUnavailable(),
    removeStore: async () => setupUnavailable(),
    createHousehold: async () => setupUnavailable(),
    joinHousehold: async () => setupUnavailable(),
    peekJoinToken: async () => setupUnavailable(),
    claimJoinToken: async () => setupUnavailable(),
    createJoinToken: async () => setupUnavailable(),
    requestWeekBallot: async () => setupUnavailable(),
  };
}

export function SupperProvider({ children }: { children: React.ReactNode }) {
  const setupValue = useMemo(() => createSetupContext(), []);
  if (!isSupabaseConfigured()) {
    return <SupperContext.Provider value={setupValue}>{children}</SupperContext.Provider>;
  }

  return <SupabaseSupperProvider>{children}</SupabaseSupperProvider>;
}

function SupabaseSupperProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [snapshot, setSnapshot] = useState<HouseholdSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    const client = createSupabaseBrowserClient();
    if (!client) return;
    const { data: userData } = await client.auth.getUser();
    const user = userData.user;
    if (!user) {
      setSession(null);
      setSnapshot(null);
      return;
    }
    try {
      const nextSession = await fetchSupabaseSession(client);
      setSession(nextSession);
      setSnapshot(nextSession ? await fetchSupabaseSnapshot(client, nextSession) : null);
    } catch (err) {
      setSession({
        userId: user.id,
        email: user.email ?? "",
        displayName:
          (user.user_metadata.display_name as string | undefined) ||
          user.email?.split("@")[0] ||
          "You",
        membershipId: null,
        householdId: null,
        role: null,
      });
      setSnapshot(null);
      throw err;
    }
  };

  useEffect(() => {
    let cancelled = false;
    const markReady = () => {
      if (!cancelled) setReady(true);
    };

    void (async () => {
      try {
        await refresh();
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load Bot My Meals.");
      } finally {
        markReady();
      }
    })();

    const client = createSupabaseBrowserClient();
    if (!client) {
      markReady();
      return () => {
        cancelled = true;
      };
    }
    const channel = client
      .channel("supper-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "votes" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "meals" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "weeks" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "shopping_items" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "ballot_requests" }, () => void refresh())
      .subscribe();
    return () => {
      cancelled = true;
      void client.removeChannel(channel);
    };
  }, []);

  const run = async <T,>(fn: () => Promise<T> | T): Promise<T> => {
    setError(null);
    try {
      const result = await fn();
      await refresh();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
      throw err;
    }
  };

  const value = useMemo<SupperContextValue>(
    () => ({
      ready,
      mode: "supabase",
      session,
      snapshot,
      error,
      refresh,
      bootstrapHousehold: (input) =>
        run(async () => {
          const client = createSupabaseBrowserClient();
          if (!client) throw new Error("Not signed in");
          await supabaseCreateHousehold(client, input.householdName);
        }),
      addMember: (draft) =>
        run(async () => {
          const client = createSupabaseBrowserClient();
          if (!client || !session) throw new Error("Not signed in");
          await supabaseInviteMember(client, session, draft);
        }),
      updateMemberRole: (memberId, role) =>
        run(async () => {
          const client = createSupabaseBrowserClient();
          if (!client || !session) throw new Error("Not signed in");
          await supabaseSetMemberRole(client, session, memberId, role);
        }),
      removeMember: (memberId) =>
        run(async () => {
          const client = createSupabaseBrowserClient();
          if (!client || !session) throw new Error("Not signed in");
          await supabaseRemoveMember(client, session, memberId);
        }),
      removeInvite: (inviteId) =>
        run(async () => {
          const client = createSupabaseBrowserClient();
          if (!client || !session) throw new Error("Not signed in");
          await supabaseRemoveInvite(client, session, inviteId);
        }),
      signInMagicLink: async (email, options) => {
        const client = createSupabaseBrowserClient();
        if (!client) throw new Error("Supabase is not configured.");
        const next = safeAuthNext(options?.next);
        const redirect =
          next === "/week"
            ? `${window.location.origin}/auth/callback`
            : `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
        const { error: authError } = await client.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: redirect },
        });
        if (authError) throw new Error(authError.message);
      },
      signOut: () =>
        run(async () => {
          const client = createSupabaseBrowserClient();
          await client?.auth.signOut();
        }),
      setVote: (mealId, choice, note) =>
        run(async () => {
          const client = createSupabaseBrowserClient();
          if (!client || !session) throw new Error("Not signed in");
          return supabaseSetVote(client, session, mealId, choice, note ?? "");
        }),
      proposeReplacement: (mealId, proposal) =>
        run(async () => {
          const client = createSupabaseBrowserClient();
          if (!client || !session) throw new Error("Not signed in");
          await supabaseProposeReplacement(client, session, mealId, proposal);
        }),
      applyIdea: (mealId, ideaId) =>
        run(async () => {
          const idea = REPLACEMENT_IDEAS.find((item) => item.id === ideaId);
          if (!idea || !snapshot) throw new Error("Unknown idea");
          const storeBySlug = new Map(snapshot.stores.map((store) => [store.slug, store.id]));
          const client = createSupabaseBrowserClient();
          if (!client || !session) throw new Error("Not signed in");
          await supabaseProposeReplacement(client, session, mealId, {
            title: idea.title,
            pitch: idea.pitch,
            prepMinutes: idea.prepMinutes,
            steps: idea.steps,
            ingredients: idea.ingredients.map((ingredient) => ({
              name: ingredient.name,
              quantity: ingredient.quantity,
              unit: ingredient.unit,
              storeId: storeBySlug.get(ingredient.storeSlug) ?? snapshot.stores[0].id,
            })),
          });
        }),
      markLeftovers: (mealId, sourceMealId) =>
        run(async () => {
          if (!snapshot) throw new Error("Nothing to mark");
          const source = snapshot.meals.find((meal) => meal.id === sourceMealId);
          if (!source) throw new Error("Source meal missing");
          const client = createSupabaseBrowserClient();
          if (!client || !session) throw new Error("Not signed in");
          await supabaseProposeReplacement(client, session, mealId, {
            title: `Leftover ${source.title}`,
            pitch: `Same food as ${source.title}, no extra shopping trip.`,
            prepMinutes: 15,
            steps: ["Warm the leftovers and serve."],
            ingredients: [],
          });
        }),
      lockWeek: () =>
        run(async () => {
          const client = createSupabaseBrowserClient();
          if (!client || !session || !snapshot) throw new Error("Not signed in");
          await supabaseLockWeek(client);
        }),
      unlockWeek: () =>
        run(async () => {
          const client = createSupabaseBrowserClient();
          if (!client || !session || !snapshot) throw new Error("Not signed in");
          await supabaseUnlockWeek(client, session, snapshot.week.id);
        }),
      toggleItem: (itemId, checked) =>
        run(async () => {
          const client = createSupabaseBrowserClient();
          if (!client) throw new Error("Not signed in");
          await supabaseToggleItem(client, itemId, checked);
        }),
      updateHousehold: (patch) =>
        run(async () => {
          const client = createSupabaseBrowserClient();
          if (!client || !session) throw new Error("Not signed in");
          await supabaseUpdateHousehold(client, session, patch);
        }),
      addStore: (name) =>
        run(async () => {
          const client = createSupabaseBrowserClient();
          if (!client || !session?.householdId) throw new Error("Not signed in");
          const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
          const { error: insertError } = await client.from("household_stores").insert({
            household_id: session.householdId,
            name,
            slug,
          });
          if (insertError) throw new Error(insertError.message);
        }),
      removeStore: (storeId) =>
        run(async () => {
          const client = createSupabaseBrowserClient();
          if (!client) throw new Error("Not signed in");
          const { error: deleteError } = await client.from("household_stores").delete().eq("id", storeId);
          if (deleteError) throw new Error(deleteError.message);
        }),
      createHousehold: (name) =>
        run(async () => {
          const client = createSupabaseBrowserClient();
          if (!client) throw new Error("Not signed in");
          await supabaseCreateHousehold(client, name);
        }),
      joinHousehold: (code) =>
        run(async () => {
          const client = createSupabaseBrowserClient();
          if (!client) throw new Error("Not signed in");
          await supabaseJoinByCode(client, code);
        }),
      peekJoinToken: async (token) => {
        const client = createSupabaseBrowserClient();
        if (!client) throw new Error("Supabase is not configured.");
        return supabasePeekJoinToken(client, token);
      },
      claimJoinToken: (token) =>
        run(async () => {
          const client = createSupabaseBrowserClient();
          if (!client) throw new Error("Not signed in");
          await supabaseClaimJoinToken(client, token);
        }),
      createJoinToken: (rotate) =>
        run(async () => {
          const client = createSupabaseBrowserClient();
          if (!client) throw new Error("Not signed in");
          return supabaseCreateJoinToken(client, rotate === true);
        }),
      requestWeekBallot: () =>
        run(async () => {
          const client = createSupabaseBrowserClient();
          if (!client) throw new Error("Not signed in");
          return supabaseRequestWeekBallot(client);
        }),
    }),
    // refresh/run close over the latest session and snapshot on each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, session, snapshot, error],
  );

  return <SupperContext.Provider value={value}>{children}</SupperContext.Provider>;
}
