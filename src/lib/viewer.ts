import { cache } from "react";
import type { FollowButtonState } from "@/components/follow-button";
import { getBlockState, getFollowStatus } from "@/lib/follows";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createClient } from "@/utils/supabase/server";

// The signed-in account looking at a page. Guests have anonymous sessions, so
// they count as signed out here.
export const getViewer = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user && !user.is_anonymous ? user : null;
});

// How the viewer relates to a profile owner: what their Follow button shows,
// and whether the owner has blocked them (then the profile is hidden from them
// while they're signed in).
export const getViewerRelation = cache(
  async (ownerId: string): Promise<{ state: FollowButtonState; isOwner: boolean; hidden: boolean }> => {
    const viewer = await getViewer();
    if (!viewer) return { state: "signed-out", isOwner: false, hidden: false };
    if (viewer.id === ownerId) return { state: "none", isOwner: true, hidden: false };

    const [{ data: viewerProfile }, status, blocks] = await Promise.all([
      supabaseAdmin.from("profiles").select("username").eq("id", viewer.id).single(),
      getFollowStatus(viewer.id, ownerId),
      getBlockState(viewer.id, ownerId),
    ]);

    if (blocks.blockedByOther) return { state: "none", isOwner: false, hidden: true };
    if (blocks.blockedOther) return { state: "blocked", isOwner: false, hidden: false };
    return {
      state: status ?? (viewerProfile?.username ? "none" : "needs-profile"),
      isOwner: false,
      hidden: false,
    };
  },
);
