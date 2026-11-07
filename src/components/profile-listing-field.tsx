"use client";

import Link from "next/link";
import { Checkbox } from "@/components/base/checkbox/checkbox";

export function ProfileListingField({
  username,
  isPublic,
  isSelected,
  onChange,
  hasShippingAddress = false,
}: {
  username: string | null;
  isPublic: boolean;
  isSelected: boolean;
  onChange: (selected: boolean) => void;
  hasShippingAddress?: boolean;
}) {
  if (!username) {
    return (
      <p className="text-sm text-tertiary">
        Want friends to find this on one page?{" "}
        <Link
          href="/dashboard/account"
          target="_blank"
          className="font-medium text-brand-600 hover:underline"
        >
          Set up your public profile
        </Link>
      </p>
    );
  }

  let hint = isPublic
    ? `Anyone with your profile link (/u/${username}) can see this registry.`
    : "It's private, so only followers you approve can see it on your profile.";
  if (isSelected && hasShippingAddress) {
    hint += " Anyone who reserves a gift can see your shipping address.";
  }

  return (
    <div>
      <input type="hidden" name="listedOnProfile" value={isSelected ? "true" : "false"} />
      <Checkbox
        isSelected={isSelected}
        onChange={onChange}
        label={<span className="font-normal">Show on my profile</span>}
        hint={hint}
      />
    </div>
  );
}
