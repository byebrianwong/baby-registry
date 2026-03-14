"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { acceptInvite } from "@/lib/actions/registry";

export function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAccept = async () => {
    setLoading(true);
    setError("");
    const result = await acceptInvite(token);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="space-y-3">
      <Button
        onClick={handleAccept}
        disabled={loading}
        className="!bg-[#004659] hover:!bg-[#003847] !ring-[#004659] !text-white"
      >
        {loading ? "Accepting..." : "Accept Invitation"}
      </Button>
      {error && <p className="text-sm text-error-primary">{error}</p>}
    </div>
  );
}
