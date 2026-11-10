import { NativeTabs } from "expo-router/native-tabs";

import { useTheme } from "@/lib/theme";

export default function TabsLayout() {
  const theme = useTheme();
  return (
    <NativeTabs
      tintColor={theme.tint}
      backgroundColor={theme.background}
      labelStyle={{ selected: { color: theme.tint } }}
      minimizeBehavior="onScrollDown"
    >
      <NativeTabs.Trigger name="(home)">
        <NativeTabs.Trigger.Label>Registries</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "gift", selected: "gift.fill" }} md="redeem" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Label>Account</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "person.crop.circle", selected: "person.crop.circle.fill" }} md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
