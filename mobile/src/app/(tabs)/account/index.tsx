import { useQuery } from "@tanstack/react-query";
import * as Application from "expo-application";
import * as WebBrowser from "expo-web-browser";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { Icon, type IconName } from "@/components/icon";
import { Divider, Section, Text } from "@/components/ui";
import { signOut, useSession } from "@/lib/auth";
import { initials } from "@/lib/format";
import { clearCache } from "@/lib/query";
import { SITE_URL, supabase } from "@/lib/supabase";
import { spacing, useTheme } from "@/lib/theme";

export default function AccountScreen() {
  const theme = useTheme();
  const { session, demo, endDemo } = useSession();
  const userId = session?.user.id;
  const profile = useQuery({
    queryKey: ["profile", userId],
    enabled: Boolean(userId) && !demo,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name").eq("id", userId!).single();
      return { fullName: (data?.full_name as string | null)?.trim() || null };
    },
  });
  const name = demo ? "Remi & Max" : (profile.data?.fullName ?? session?.user.email ?? "You");
  const open = (path: string) => WebBrowser.openBrowserAsync(`${SITE_URL}${path}`);

  function confirmSignOut() {
    const run = async () => {
      await clearCache();
      await signOut();
    };
    if (Platform.OS === "web") {
      run();
      return;
    }
    Alert.alert("Sign out?", "Your registries stay on Regibee. Sign in again to see them here.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: run },
    ]);
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl, paddingBottom: 120 }}
    >
      <View style={styles.profile}>
        <View style={[styles.avatar, { backgroundColor: theme.accentSoft }]}>
          <Text variant="title" style={{ color: theme.onAccentSoft }}>
            {initials(name)}
          </Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="headline" numberOfLines={1}>
            {name}
          </Text>
          {session?.user.email && session.user.email !== name ? (
            <Text variant="subhead" tone="secondary" numberOfLines={1}>
              {session.user.email}
            </Text>
          ) : null}
        </View>
      </View>

      <Section title="On regibee.com" footer="These open the website. Sign in there with the same account if it asks.">
        <Row icon="calendar" label="Events and invitations" onPress={() => open("/dashboard/events")} />
        <Divider inset={52} />
        <Row icon="people" label="People you follow" onPress={() => open("/dashboard/following")} />
        <Divider inset={52} />
        <Row icon="settings" label="Profile, privacy and email" onPress={() => open("/dashboard/account")} />
        <Divider inset={52} />
        <Row icon="lock" label="Privacy policy" onPress={() => open("/privacy")} />
      </Section>

      {demo ? (
        <Section footer="This is a sample registry. Changes you make here aren't saved.">
          <Row icon="signOut" label="Leave the demo" destructive onPress={endDemo} />
        </Section>
      ) : (
        <Section>
          <Row icon="signOut" label="Sign out" destructive onPress={confirmSignOut} />
        </Section>
      )}

      <Text variant="caption" tone="tertiary" style={{ textAlign: "center" }}>
        Regibee {Application.nativeApplicationVersion ?? ""}
        {Application.nativeBuildVersion ? ` (${Application.nativeBuildVersion})` : ""}
      </Text>
    </ScrollView>
  );
}

function Row({ icon, label, onPress, destructive }: { icon: IconName; label: string; onPress: () => void; destructive?: boolean }) {
  const theme = useTheme();
  const color = destructive ? theme.danger : theme.text;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? theme.surfaceAlt : "transparent" }]}
    >
      <Icon name={icon} size={20} color={destructive ? theme.danger : theme.tint} />
      <Text variant="callout" style={{ flex: 1, color }}>
        {label}
      </Text>
      {!destructive ? <Icon name="external" size={15} color={theme.textTertiary} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  avatar: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, minHeight: 52 },
});
