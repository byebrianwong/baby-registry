"use client";

import { AccountSettings } from "@/components/account-settings";
import { DEMO_FOLLOWS, DEMO_ME, demoOk } from "@/lib/demo-people";
import { demoOwnRegistries } from "@/lib/demo-registries";
import { useDemoToday } from "../../demo-today";
import { DemoOwnerShell } from "../../_components/demo-shell";

/** The demo's Account page. Like src/app/(protected)/dashboard/account/page.tsx. */
export default function DemoAccountPage() {
  const today = useDemoToday();

  return (
    <DemoOwnerShell>
      <AccountSettings
        profile={{
          public_id: DEMO_ME.public_id,
          full_name: DEMO_ME.full_name,
          discoverable: DEMO_ME.discoverable,
          findable_by_email: DEMO_ME.findable_by_email,
          email_follow_requests: true,
        }}
        registries={demoOwnRegistries(today).map((registry) => ({
          id: registry.id,
          title: registry.title,
          is_public: registry.is_public,
          listed_on_profile: registry.listed_on_profile,
          registry_type: registry.registry_type,
          event_type: registry.event_type,
          has_shipping_address: Boolean(registry.settings.shipping_address),
        }))}
        follows={DEMO_FOLLOWS}
        saveAction={demoOk}
        listAction={demoOk}
        followActions={{
          approveAction: demoOk,
          removeAction: demoOk,
          cancelAction: demoOk,
          blockAction: demoOk,
          unblockAction: demoOk,
        }}
        basePath="/demo"
      />
    </DemoOwnerShell>
  );
}
