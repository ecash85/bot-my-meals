"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { BallotToast } from "@/components/ballot-toast";
import { isSupabaseConfigured } from "@/lib/config";
import { storeSlugForAdd } from "@/lib/grocers";
import { createId } from "@/lib/ids";
import { todayInTimeZone } from "@/lib/meal-history";
import { REPLACEMENT_IDEAS } from "@/lib/ideas";
import {
  OPTIMISTIC_STORE_PREFIX,
  applyOptimistic,
  dropOptimistic,
  patchHousehold,
  patchItemChecked,
  patchMealProposal,
  patchMemberRole,
  patchStoreAdded,
  patchStoreRemoved,
  LIST_CHECK_SAVE_ERROR,
  patchShoppingPrompt,
  patchVote,
  queueOptimistic,
  type OptimisticPatch,
  type PendingOptimistic,
} from "@/lib/optimistic";
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
  supabaseSetShoppingPrompt,
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
  ShoppingPrompt,
  VoteChoice,
} from "@/lib/types";
import type { MemberDraft } from "@/lib/users";

const SETUP_REQUIRED = "This install is not connected to Supabase yet. Finish setup first.";

function actionMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong.";
}

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
  closeShoppingPrompt: (prompt: Extract<ShoppingPrompt, "done" | "dismissed">) => Promise<void>;
  toggleItem: (itemId: string, checked: boolean) => Promise<void>;
  updateHousehold: (patch: HouseholdSettingsPatch) => Promise<void>;
  addStore: (slug: string, name: string) => Promise<void>;
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
    closeShoppingPrompt: async () => setupUnavailable(),
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
  const [notice, setNotice] = useState<string | null>(null);
  const baseRef = useRef<HouseholdSnapshot | null>(null);
  const displayRef = useRef<HouseholdSnapshot | null>(null);
  const patchesRef = useRef<PendingOptimistic<HouseholdSnapshot>[]>([]);
  const patchSeq = useRef(0);
  const refreshGen = useRef(0);
  const chainsRef = useRef(new Map<string, Promise<void>>());
  const cancelledStoreAdds = useRef(new Set<string>());
  const storePatchKeys = useRef(new Map<string, string>());

  const publish = useCallback((base: HouseholdSnapshot | null) => {
    baseRef.current = base;
    const next = base ? applyOptimistic(base, patchesRef.current) : null;
    displayRef.current = next;
    setSnapshot(next);
  }, []);

  const refresh = useCallback(async () => {
    const client = createSupabaseBrowserClient();
    if (!client) return;
    const gen = ++refreshGen.current;
    const { data: userData } = await client.auth.getUser();
    if (gen !== refreshGen.current) return;
    const user = userData.user;
    if (!user) {
      patchesRef.current = [];
      setSession(null);
      publish(null);
      return;
    }
    try {
      const nextSession = await fetchSupabaseSession(client);
      if (gen !== refreshGen.current) return;
      const nextSnapshot = nextSession ? await fetchSupabaseSnapshot(client, nextSession) : null;
      if (gen !== refreshGen.current) return;
      setSession(nextSession);
      publish(nextSnapshot);
    } catch (err) {
      if (gen !== refreshGen.current) return;
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
      patchesRef.current = [];
      publish(null);
      throw err;
    }
  }, [publish]);

  const dismissNotice = useCallback(() => setNotice(null), []);

  const run = async <T,>(fn: () => Promise<T> | T): Promise<T> => {
    setError(null);
    try {
      const result = await fn();
      await refresh();
      return result;
    } catch (err) {
      const message = actionMessage(err);
      setError(message);
      setNotice(message);
      throw err;
    }
  };

  const runOptimistic = async <T,>(
    key: string,
    apply: OptimisticPatch<HouseholdSnapshot>,
    fn: () => Promise<T>,
    options?: { replace?: boolean },
  ): Promise<T> => {
    const id = ++patchSeq.current;
    const replace = options?.replace !== false;
    const patchKey = replace ? key : `${key}:${id}`;
    patchesRef.current = replace
      ? queueOptimistic(patchesRef.current, patchKey, id, apply)
      : [...patchesRef.current, { id, key: patchKey, apply }];
    publish(baseRef.current);
    setError(null);

    const previous = chainsRef.current.get(key) ?? Promise.resolve();
    let skipped = false;
    const task = previous.catch(() => undefined).then(async () => {
      if (!patchesRef.current.some((patch) => patch.id === id)) {
        skipped = true;
        return undefined as T;
      }
      return fn();
    });
    chainsRef.current.set(
      key,
      task.then(
        () => undefined,
        () => undefined,
      ),
    );

    try {
      const result = await task;
      if (skipped) {
        patchesRef.current = dropOptimistic(patchesRef.current, id);
        return result;
      }
      const mine = patchesRef.current.find((patch) => patch.id === id);
      patchesRef.current = dropOptimistic(patchesRef.current, id);
      if (mine && baseRef.current) {
        baseRef.current = mine.apply(baseRef.current);
        displayRef.current = applyOptimistic(baseRef.current, patchesRef.current);
      }
      await refresh().catch(() => undefined);
      return result;
    } catch (err) {
      const latest = patchesRef.current.some((patch) => patch.id === id);
      patchesRef.current = dropOptimistic(patchesRef.current, id);
      if (latest) {
        publish(baseRef.current);
        const message = actionMessage(err);
        setError(message);
        setNotice(message);
      }
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
  }, [refresh]);

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
      updateMemberRole: (memberId, role) => {
        const current = session;
        if (!current) return run(async () => { throw new Error("Not signed in"); });
        return runOptimistic(`member:${memberId}`, (snap) => patchMemberRole(snap, memberId, role), async () => {
          const client = createSupabaseBrowserClient();
          if (!client) throw new Error("Not signed in");
          await supabaseSetMemberRole(client, current, memberId, role);
        });
      },
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
      setVote: (mealId, choice, note) => {
        const current = session;
        const visible = displayRef.current;
        if (!current?.membershipId || !current.householdId || !visible) {
          return run(async () => {
            throw new Error("Not signed in");
          });
        }
        const trimmed = note ?? "";
        return runOptimistic(
          `vote:${mealId}:${current.membershipId}`,
          (snap) =>
            patchVote(snap, {
              mealId,
              membershipId: current.membershipId ?? "",
              householdId: current.householdId ?? "",
              choice,
              note: trimmed,
            }),
          async () => {
            const client = createSupabaseBrowserClient();
            if (!client) throw new Error("Not signed in");
            return supabaseSetVote(client, current, mealId, choice, trimmed);
          },
        );
      },
      proposeReplacement: (mealId, proposal) => {
        const current = session;
        return runOptimistic(`meal:${mealId}`, (snap) => patchMealProposal(snap, mealId, proposal), async () => {
          const client = createSupabaseBrowserClient();
          if (!client || !current) throw new Error("Not signed in");
          await supabaseProposeReplacement(client, current, mealId, proposal);
        });
      },
      applyIdea: (mealId, ideaId) => {
        const current = session;
        const visible = displayRef.current;
        const idea = REPLACEMENT_IDEAS.find((item) => item.id === ideaId);
        if (!idea || !visible || !current) {
          return run(async () => {
            throw new Error(!current ? "Not signed in" : "Unknown idea");
          });
        }
        const storeBySlug = new Map(visible.stores.map((store) => [store.slug, store.id]));
        const proposal = {
          title: idea.title,
          pitch: idea.pitch,
          prepMinutes: idea.prepMinutes,
          steps: idea.steps,
          ingredients: idea.ingredients.map((ingredient) => ({
            name: ingredient.name,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            storeId: storeBySlug.get(ingredient.storeSlug) ?? visible.stores[0]?.id ?? "",
          })),
        };
        return runOptimistic(`meal:${mealId}`, (snap) => patchMealProposal(snap, mealId, proposal), async () => {
          const client = createSupabaseBrowserClient();
          if (!client) throw new Error("Not signed in");
          await supabaseProposeReplacement(client, current, mealId, proposal);
        });
      },
      markLeftovers: (mealId, sourceMealId) => {
        const current = session;
        const visible = displayRef.current;
        const source = visible?.meals.find((meal) => meal.id === sourceMealId);
        if (!visible || !current || !source) {
          return run(async () => {
            throw new Error(!current ? "Not signed in" : "Source meal missing");
          });
        }
        const proposal = {
          title: `Leftover ${source.title}`,
          pitch: `Same food as ${source.title}, no extra shopping trip.`,
          prepMinutes: 15,
          steps: ["Warm the leftovers and serve."],
          ingredients: [],
        };
        return runOptimistic(`meal:${mealId}`, (snap) => patchMealProposal(snap, mealId, proposal), async () => {
          const client = createSupabaseBrowserClient();
          if (!client) throw new Error("Not signed in");
          await supabaseProposeReplacement(client, current, mealId, proposal);
        });
      },
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
          const editableFrom = todayInTimeZone(new Date(), snapshot.household.timezone);
          await supabaseUnlockWeek(client, session, snapshot.week.id, editableFrom);
        }),
      closeShoppingPrompt: (prompt) =>
        runOptimistic("shopping-prompt", (snap) => patchShoppingPrompt(snap, prompt), async () => {
          const client = createSupabaseBrowserClient();
          if (!client || !snapshot) throw new Error("Not signed in");
          await supabaseSetShoppingPrompt(client, snapshot.week.id, prompt);
        }),
      toggleItem: (itemId, checked) =>
        runOptimistic(`item:${itemId}`, (snap) => patchItemChecked(snap, itemId, checked), async () => {
          const client = createSupabaseBrowserClient();
          if (!client) throw new Error(LIST_CHECK_SAVE_ERROR);
          try {
            await supabaseToggleItem(client, itemId, checked);
          } catch {
            throw new Error(LIST_CHECK_SAVE_ERROR);
          }
        }),
      updateHousehold: (patch) => {
        const current = session;
        const persist = async () => {
          const client = createSupabaseBrowserClient();
          if (!client || !current) throw new Error("Not signed in");
          await supabaseUpdateHousehold(client, current, patch);
        };
        if (patch.setupStep !== undefined) return run(persist);
        return runOptimistic("household", (snap) => patchHousehold(snap, patch), persist, {
          replace: false,
        });
      },
      addStore: (slug, name) => {
        const current = session;
        const storedSlug = storeSlugForAdd(name, slug);
        const tempId = `${OPTIMISTIC_STORE_PREFIX}${createId("store")}`;
        const patchKey = `store:${storedSlug}`;
        storePatchKeys.current.set(tempId, patchKey);
        return runOptimistic(patchKey, (snap) => patchStoreAdded(snap, { id: tempId, name, slug: storedSlug }), async () => {
          const client = createSupabaseBrowserClient();
          if (!client || !current?.householdId) throw new Error("Not signed in");
          const { data, error: insertError } = await client
            .from("household_stores")
            .insert({
              household_id: current.householdId,
              name,
              slug: storedSlug,
            })
            .select("id")
            .single();
          if (insertError) throw new Error(insertError.message);
          const realId = typeof data?.id === "string" ? data.id : null;
          if (realId && cancelledStoreAdds.current.has(tempId)) {
            cancelledStoreAdds.current.delete(tempId);
            const { error: deleteError } = await client.from("household_stores").delete().eq("id", realId);
            if (deleteError) throw new Error(deleteError.message);
          }
        });
      },
      removeStore: (storeId) => {
        if (storeId.startsWith(OPTIMISTIC_STORE_PREFIX)) {
          cancelledStoreAdds.current.add(storeId);
          const patchKey = storePatchKeys.current.get(storeId);
          if (patchKey) {
            patchesRef.current = patchesRef.current.filter((patch) => patch.key !== patchKey);
            publish(baseRef.current);
          }
          return Promise.resolve();
        }
        return runOptimistic(`store-remove:${storeId}`, (snap) => patchStoreRemoved(snap, storeId), async () => {
          const client = createSupabaseBrowserClient();
          if (!client) throw new Error("Not signed in");
          const { error: deleteError } = await client.from("household_stores").delete().eq("id", storeId);
          if (deleteError) throw new Error(deleteError.message);
        });
      },
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

  return (
    <SupperContext.Provider value={value}>
      {children}
      <BallotToast message={notice ?? undefined} onDismiss={dismissNotice} alert />
    </SupperContext.Provider>
  );
}
