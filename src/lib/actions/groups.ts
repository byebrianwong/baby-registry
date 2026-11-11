"use server";

import { revalidatePath } from "next/cache";
import { requireAccount } from "@/lib/require-account";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isEmail } from "@/lib/events";
import { getGroupForOwner, getGroupMembers, listGroupsForOwner, listRegistryGroupIds } from "@/lib/groups-server";
import {
  MAX_GROUP_MEMBERS,
  MAX_GROUPS_PER_OWNER,
  newPeople,
  readGroupName,
  type GroupSummary,
  type Person,
} from "@/lib/groups";

// Changes to groups (see src/lib/groups.ts). Only a group's owner can change
// it. The tables are server-only, so every change goes through the
// service-role client after these checks.

type Result<T = object> = ({ error: null } & T) | { error: string };

async function requireGroupOwner(groupId: string) {
  const { user, error } = await requireAccount();
  if (error || !user) return { error: error ?? "You need an account to do this." } as const;
  const group = await getGroupForOwner(groupId, user.id);
  if (!group) return { error: "That group wasn't found." } as const;
  return { error: null, user, group } as const;
}

function revalidateGroup(groupId: string) {
  revalidatePath("/dashboard/events");
  revalidatePath(`/dashboard/groups/${groupId}`);
}

/** Checks a list of people before it's saved: names, emails and the size limit. */
function checkPeople(people: Person[]): string | null {
  for (const person of people) {
    if (!person.name.trim()) return "Every person needs a name.";
    if (person.name.trim().length > 100) return "Keep names under 100 characters.";
    if (person.email && !isEmail(person.email.trim())) return `"${person.email}" doesn't look like an email address.`;
  }
  return null;
}

/**
 * Makes a group with these people in it. Shared by "New group" and "Save
 * this guest list as a group". Returns the new group's id.
 */
export async function createGroup(name: string, people: Person[] = []): Promise<Result<{ id: string }>> {
  const { user, error: authError } = await requireAccount();
  if (authError || !user) return { error: authError ?? "You need an account to do this." };
  const checked = readGroupName(name);
  if ("error" in checked) return { error: checked.error };
  const problem = checkPeople(people);
  if (problem) return { error: problem };
  const members = newPeople([], people);
  if (members.length > MAX_GROUP_MEMBERS) return { error: `A group can have up to ${MAX_GROUP_MEMBERS} people.` };

  const { count } = await supabaseAdmin
    .from("groups")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);
  if ((count ?? 0) >= MAX_GROUPS_PER_OWNER) {
    return { error: `You can have up to ${MAX_GROUPS_PER_OWNER} groups. Delete one you don't use first.` };
  }

  const { data: group, error } = await supabaseAdmin
    .from("groups")
    .insert({ owner_id: user.id, name: checked.name })
    .select("id")
    .single();
  if (error || !group) return { error: "The group wasn't made. Try again." };

  if (members.length > 0) {
    const { error: membersError } = await supabaseAdmin
      .from("group_members")
      .insert(members.map((m) => ({ group_id: group.id, name: m.name, email: m.email })));
    if (membersError) {
      await supabaseAdmin.from("groups").delete().eq("id", group.id);
      return { error: "The group wasn't made. Try again." };
    }
  }
  revalidateGroup(group.id);
  return { error: null, id: group.id };
}

export async function renameGroup(groupId: string, name: string): Promise<Result> {
  const access = await requireGroupOwner(groupId);
  if (access.error !== null) return { error: access.error };
  const checked = readGroupName(name);
  if ("error" in checked) return { error: checked.error };
  const { error } = await supabaseAdmin.from("groups").update({ name: checked.name }).eq("id", groupId);
  if (error) return { error: "The name wasn't saved. Try again." };
  revalidateGroup(groupId);
  return { error: null };
}

/**
 * Deletes a group. Events made from it keep their guests, and lists shared
 * with it stop being shared with those people.
 */
export async function deleteGroup(groupId: string): Promise<Result> {
  const access = await requireGroupOwner(groupId);
  if (access.error !== null) return { error: access.error };
  const { error } = await supabaseAdmin.from("groups").delete().eq("id", groupId);
  if (error) return { error: "The group wasn't deleted. Try again." };
  revalidatePath("/dashboard/events");
  revalidatePath("/dashboard/following");
  return { error: null };
}

/** Adds people to a group, skipping anyone already in it. */
export async function addGroupMembers(
  groupId: string,
  people: Person[],
): Promise<Result<{ added: number; alreadyListed: number }>> {
  const access = await requireGroupOwner(groupId);
  if (access.error !== null) return { error: access.error };
  const problem = checkPeople(people);
  if (problem) return { error: problem };

  const existing = await getGroupMembers(groupId);
  const toAdd = newPeople(existing, people);
  if (existing.length + toAdd.length > MAX_GROUP_MEMBERS) {
    return { error: `A group can have up to ${MAX_GROUP_MEMBERS} people.` };
  }
  if (toAdd.length > 0) {
    const { error } = await supabaseAdmin
      .from("group_members")
      .insert(toAdd.map((m) => ({ group_id: groupId, name: m.name, email: m.email })));
    if (error) return { error: "Those people weren't added. Try again." };
  }
  revalidateGroup(groupId);
  return { error: null, added: toAdd.length, alreadyListed: people.length - toAdd.length };
}

export async function removeGroupMember(groupId: string, memberId: string): Promise<Result> {
  const access = await requireGroupOwner(groupId);
  if (access.error !== null) return { error: access.error };
  const { error } = await supabaseAdmin.from("group_members").delete().eq("id", memberId).eq("group_id", groupId);
  if (error) return { error: "That person wasn't removed. Try again." };
  revalidateGroup(groupId);
  revalidatePath("/dashboard/following");
  return { error: null };
}

/**
 * Which of the owner's groups a list is shared with. People in those groups
 * who have an account see the list on their Following page, and on the
 * owner's profile when it's listed there, even when it's private. Only the
 * list's owner can choose, and only their own groups.
 */
export async function setRegistryGroups(registryId: string, groupIds: string[]): Promise<Result> {
  const { user, error: authError } = await requireAccount();
  if (authError || !user) return { error: authError ?? "You need an account to do this." };
  const { data: registry } = await supabaseAdmin
    .from("registries")
    .select("id, owner_id")
    .eq("id", registryId)
    .maybeSingle();
  if (!registry || registry.owner_id !== user.id) return { error: "Only the list's owner can share it with groups." };

  const wanted = [...new Set(groupIds)];
  if (wanted.length > 0) {
    const { data: owned } = await supabaseAdmin.from("groups").select("id").eq("owner_id", user.id).in("id", wanted);
    if ((owned || []).length !== wanted.length) return { error: "You can only share with your own groups." };
  }

  const { data: current } = await supabaseAdmin.from("registry_groups").select("group_id").eq("registry_id", registryId);
  const now = new Set((current || []).map((row) => row.group_id as string));
  const toRemove = [...now].filter((id) => !wanted.includes(id));
  const toAdd = wanted.filter((id) => !now.has(id));

  if (toRemove.length > 0) {
    const { error } = await supabaseAdmin
      .from("registry_groups")
      .delete()
      .eq("registry_id", registryId)
      .in("group_id", toRemove);
    if (error) return { error: "That wasn't saved. Try again." };
  }
  if (toAdd.length > 0) {
    const { error } = await supabaseAdmin
      .from("registry_groups")
      .insert(toAdd.map((groupId) => ({ registry_id: registryId, group_id: groupId, shared_by: user.id })));
    if (error) return { error: "That wasn't saved. Try again." };
  }
  revalidatePath(`/dashboard/registry/${registryId}/settings`);
  for (const id of [...toAdd, ...toRemove]) revalidatePath(`/dashboard/groups/${id}`);
  revalidatePath("/dashboard/following");
  return { error: null };
}

/**
 * For a list's Settings page: the owner's groups, and which ones the list is
 * shared with. The page runs in the browser, which can't read the group
 * tables, so it asks here. Only the list's owner gets an answer.
 */
export async function getRegistryGroupChoices(
  registryId: string,
): Promise<Result<{ groups: GroupSummary[]; sharedWith: string[] }>> {
  const { user, error: authError } = await requireAccount();
  if (authError || !user) return { error: authError ?? "You need an account to do this." };
  const { data: registry } = await supabaseAdmin
    .from("registries")
    .select("owner_id")
    .eq("id", registryId)
    .maybeSingle();
  if (!registry || registry.owner_id !== user.id) return { error: "Only the list's owner can share it with groups." };
  const [groups, sharedWith] = await Promise.all([listGroupsForOwner(user.id), listRegistryGroupIds(registryId)]);
  return { error: null, groups, sharedWith };
}
