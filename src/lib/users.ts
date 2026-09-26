import { createId } from "./ids";
import type { HouseholdSnapshot, Membership, Role, Session } from "./types";

export type MemberDraft = {
  displayName: string;
  email: string;
  role: Role;
};

export function roleLabel(role: Role): string {
  switch (role) {
    case "owner":
      return "Admin";
    case "voter":
      return "User";
    case "eater":
      return "Eater";
    default: {
      const _never: never = role;
      return _never;
    }
  }
}

export function isAdmin(role: Role | null | undefined): boolean {
  return role === "owner";
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateMemberDraft(
  draft: MemberDraft,
  existing: Membership[],
  ignoreMemberId?: string,
): string | null {
  if (!draft.displayName.trim()) return "Name is required.";
  if (!draft.email.includes("@")) return "Email is required.";
  const email = normalizeEmail(draft.email);
  const taken = existing.some(
    (member) => member.id !== ignoreMemberId && normalizeEmail(member.email) === email,
  );
  if (taken) return "Someone already uses that email.";
  return null;
}

export function assertCanRemoveMember(memberships: Membership[], memberId: string) {
  const member = memberships.find((item) => item.id === memberId);
  if (!member) throw new Error("That person is not in this household.");
  const admins = memberships.filter((item) => item.role === "owner");
  if (member.role === "owner" && admins.length <= 1) {
    throw new Error("Keep at least one Admin.");
  }
}

export function assertCanChangeRole(
  memberships: Membership[],
  memberId: string,
  nextRole: Role,
) {
  const member = memberships.find((item) => item.id === memberId);
  if (!member) throw new Error("That person is not in this household.");
  if (member.role === "owner" && nextRole !== "owner") {
    const admins = memberships.filter((item) => item.role === "owner");
    if (admins.length <= 1) throw new Error("Keep at least one Admin.");
  }
}

export function sessionFromMembership(member: Membership): Session {
  return {
    userId: member.userId,
    email: member.email,
    displayName: member.displayName,
    membershipId: member.id,
    householdId: member.householdId,
    role: member.role,
  };
}

export function addMemberToSnapshot(
  snapshot: HouseholdSnapshot,
  draft: MemberDraft,
): { snapshot: HouseholdSnapshot; member: Membership } {
  const error = validateMemberDraft(draft, snapshot.memberships);
  if (error) throw new Error(error);
  const member: Membership = {
    id: createId("mem"),
    householdId: snapshot.household.id,
    userId: createId("user"),
    role: draft.role,
    displayName: draft.displayName.trim(),
    email: normalizeEmail(draft.email),
  };
  return {
    snapshot: {
      ...snapshot,
      memberships: [...snapshot.memberships, member],
    },
    member,
  };
}

export function updateMemberRoleInSnapshot(
  snapshot: HouseholdSnapshot,
  memberId: string,
  nextRole: Role,
): HouseholdSnapshot {
  assertCanChangeRole(snapshot.memberships, memberId, nextRole);
  return {
    ...snapshot,
    memberships: snapshot.memberships.map((member) =>
      member.id === memberId ? { ...member, role: nextRole } : member,
    ),
  };
}

export function removeMemberFromSnapshot(
  snapshot: HouseholdSnapshot,
  memberId: string,
): HouseholdSnapshot {
  assertCanRemoveMember(snapshot.memberships, memberId);
  return {
    ...snapshot,
    memberships: snapshot.memberships.filter((member) => member.id !== memberId),
    votes: snapshot.votes.filter((vote) => vote.membershipId !== memberId),
  };
}
