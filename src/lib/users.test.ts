import { describe, expect, it } from "vitest";
import {
  addMemberToSnapshot,
  assertCanChangeRole,
  assertCanRemoveMember,
  removeMemberFromSnapshot,
  roleLabel,
  updateMemberRoleInSnapshot,
  validateMemberDraft,
} from "./users";
import { applySampleWeek, bootstrapHousehold } from "./seed";
import type { Membership } from "./types";

const admin: Membership = {
  id: "m1",
  householdId: "h",
  userId: "u1",
  role: "owner",
  displayName: "Alex",
  email: "alex@example.com",
};

const voter: Membership = {
  id: "m2",
  householdId: "h",
  userId: "u2",
  role: "voter",
  displayName: "Sam",
  email: "sam@example.com",
};

describe("household people", () => {
  it("labels owner as Admin and voter as User", () => {
    expect(roleLabel("owner")).toBe("Admin");
    expect(roleLabel("voter")).toBe("User");
  });

  it("rejects a blank name or missing email", () => {
    expect(validateMemberDraft({ displayName: "", email: "a@b.c", role: "voter" }, [])).toBe(
      "Name is required.",
    );
    expect(validateMemberDraft({ displayName: "Sam", email: "nope", role: "voter" }, [])).toBe(
      "Email is required.",
    );
  });

  it("rejects a duplicate email", () => {
    expect(
      validateMemberDraft({ displayName: "Other", email: "ALEX@example.com", role: "voter" }, [
        admin,
      ]),
    ).toBe("Someone already uses that email.");
  });

  it("will not remove or demote the last Admin", () => {
    expect(() => assertCanRemoveMember([admin, voter], admin.id)).toThrow("Keep at least one Admin.");
    expect(() => assertCanChangeRole([admin, voter], admin.id, "voter")).toThrow(
      "Keep at least one Admin.",
    );
    expect(() => assertCanRemoveMember([admin, voter], voter.id)).not.toThrow();
  });

  it("bootstraps a first Admin with no Tim or Rose identities", () => {
    const { snapshot, session } = bootstrapHousehold({
      householdName: "Test house",
      displayName: "Alex",
      email: "alex@example.com",
    });
    expect(snapshot.memberships).toHaveLength(1);
    expect(snapshot.memberships[0].role).toBe("owner");
    expect(snapshot.memberships[0].displayName).toBe("Alex");
    expect(session.role).toBe("owner");
    expect(snapshot.memberships.some((member) => /tim|rose/i.test(member.displayName))).toBe(false);
    expect(snapshot.memberships.some((member) => /timdoes|rosedoes/.test(member.email))).toBe(false);
    expect(snapshot.meals).toHaveLength(0);
  });

  it("lets an Admin add a User and keeps them when a sample week loads", () => {
    const { snapshot } = bootstrapHousehold({
      householdName: "Test house",
      displayName: "Alex",
      email: "alex@example.com",
    });
    const { snapshot: withUser, member } = addMemberToSnapshot(snapshot, {
      displayName: "Sam",
      email: "sam@example.com",
      role: "voter",
    });
    expect(member.role).toBe("voter");
    expect(withUser.memberships.map((item) => item.displayName)).toEqual(["Alex", "Sam"]);

    const seeded = applySampleWeek(withUser);
    expect(seeded.memberships.map((item) => item.displayName)).toEqual(["Alex", "Sam"]);
    expect(seeded.meals).toHaveLength(7);
    expect(seeded.votes).toHaveLength(0);
  });

  it("updates and removes members on a snapshot", () => {
    const { snapshot } = bootstrapHousehold({
      householdName: "Test house",
      displayName: "Alex",
      email: "alex@example.com",
    });
    const { snapshot: withUser, member } = addMemberToSnapshot(snapshot, {
      displayName: "Sam",
      email: "sam@example.com",
      role: "voter",
    });
    const promoted = updateMemberRoleInSnapshot(withUser, member.id, "owner");
    expect(promoted.memberships.find((item) => item.id === member.id)?.role).toBe("owner");
    const removed = removeMemberFromSnapshot(promoted, member.id);
    expect(removed.memberships).toHaveLength(1);
  });
});
