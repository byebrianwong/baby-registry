"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { getRegistryGroupChoices, setRegistryGroups } from "@/lib/actions/groups";
import { memberCountLabel, type GroupSummary } from "@/lib/groups";

type LoadAction = typeof getRegistryGroupChoices;
type SaveAction = (registryId: string, groupIds: string[]) => Promise<{ error: string | null }>;

/**
 * "Share with a group" on a list's Settings page, for its owner. People in
 * the chosen groups who have an account see the list on their Following
 * page, as approved followers do, even when it's private (src/lib/groups.ts).
 */
export function RegistryGroupsCard({
  registryId,
  loadAction = getRegistryGroupChoices,
  saveAction = setRegistryGroups,
}: {
  registryId: string;
  /** Reads the owner's groups. Stories pass a stand-in. */
  loadAction?: LoadAction;
  /** Saves the choice. Stories pass a stand-in. */
  saveAction?: SaveAction;
}) {
  const [groups, setGroups] = useState<GroupSummary[] | null>(null);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    loadAction(registryId).then((result) => {
      if (!live) return;
      if (result.error !== null) {
        setError(result.error);
        setGroups([]);
        return;
      }
      setGroups(result.groups);
      setChosen(new Set(result.sharedWith));
    });
    return () => {
      live = false;
    };
  }, [registryId, loadAction]);

  const toggle = (groupId: string, on: boolean) => {
    setSaved(false);
    setChosen((current) => {
      const next = new Set(current);
      if (on) next.add(groupId);
      else next.delete(groupId);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setError("");
    const result = await saveAction(registryId, [...chosen]);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Share with a group</CardTitle>
        <CardDescription>
          People in these groups who have a Regibee account see this list on their Following page, even when it&apos;s
          private. Anyone with the link can still open it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {groups === null ? (
          <p className="text-sm text-tertiary">Loading your groups…</p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-tertiary">
            You don&apos;t have any groups yet. Make one on the{" "}
            <Link href="/dashboard/events" className="font-medium text-brand-600 hover:underline">
              Events tab
            </Link>
            , or save an event&apos;s guest list as a group.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {groups.map((group) => (
              <Checkbox
                key={group.id}
                isSelected={chosen.has(group.id)}
                onChange={(on) => toggle(group.id, on)}
                label={group.name}
                hint={memberCountLabel(group.memberCount)}
              />
            ))}
            <div>
              <Button type="button" onClick={save} disabled={saving}>
                {saving ? "Saving..." : saved ? "Saved!" : "Save groups"}
              </Button>
            </div>
          </div>
        )}
        {error && <p className="mt-2 text-sm text-error-primary">{error}</p>}
      </CardContent>
    </Card>
  );
}
