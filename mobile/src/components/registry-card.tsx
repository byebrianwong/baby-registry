import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { Icon } from "@/components/icon";
import { Card, Pill, ProgressBar, Text } from "@/components/ui";
import { formatDollars, plural, relativeDay, timeAgo } from "@/lib/format";
import { occasionLabel } from "@/lib/occasion";
import { radius, spacing, useTheme } from "@/lib/theme";
import type { RegistrySummary } from "@/lib/types";

export function RegistryCard({ registry, onPress }: { registry: RegistrySummary; onPress: () => void }) {
  const theme = useTheme();
  const when = relativeDay(registry.event_date);
  const progress = registry.itemCount > 0 ? registry.fulfilledCount / registry.itemCount : 0;
  const latest = registry.recentGifts[0];

  return (
    <Card
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        registry.reservationsHidden
          ? `${registry.title}. What's been reserved is hidden from you.`
          : `${registry.title}. ${registry.fulfilledCount} of ${registry.itemCount} items given.`
      }
    >
      <View style={styles.top}>
        {registry.photo_url ? (
          <Image source={{ uri: registry.photo_url }} style={styles.photo} contentFit="cover" transition={150} cachePolicy="memory-disk" />
        ) : (
          <View style={[styles.photo, { backgroundColor: theme.accentSoft, alignItems: "center", justifyContent: "center" }]}>
            <Icon name="gift" size={26} color={theme.onAccentSoft} />
          </View>
        )}
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="title" numberOfLines={2} style={{ fontSize: 20, lineHeight: 25 }}>
            {registry.title}
          </Text>
          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
            <Pill label={occasionLabel(registry)} tone="accent" />
            {when ? <Pill label={when} tone="tint" icon="calendar" /> : null}
            {registry.role === "manager" ? <Pill label="Shared with you" icon="people" /> : null}
            {!registry.is_public ? <Pill label="Private" icon="lock" /> : null}
          </View>
        </View>
        <Icon name="chevronRight" size={16} color={theme.textTertiary} />
      </View>

      <View style={{ gap: 6 }}>
        {registry.reservationsHidden ? null : <ProgressBar value={progress} />}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          {registry.reservationsHidden ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 }}>
              <Icon name="eyeSlash" size={14} color={theme.textSecondary} />
              <Text variant="footnote" tone="secondary" numberOfLines={1} style={{ flexShrink: 1 }}>
                What&apos;s been reserved is hidden
              </Text>
            </View>
          ) : (
            <Text variant="footnote" tone="secondary">
              {registry.itemCount === 0
                ? "No items yet"
                : `${registry.fulfilledCount} of ${plural(registry.itemCount, "item")} given`}
            </Text>
          )}
          {registry.totalValue > 0 ? (
            <Text variant="footnote" tone="tertiary">
              {formatDollars(registry.totalValue)}
            </Text>
          ) : null}
        </View>
      </View>

      {latest ? (
        <View style={[styles.latest, { backgroundColor: theme.successSoft }]}>
          <Icon name="gift" size={14} color={theme.success} />
          <Text variant="footnote" style={{ flex: 1, color: theme.success }} numberOfLines={1}>
            {latest.buyer_name} {latest.held ? "reserved" : "gave"} a gift · {timeAgo(latest.created_at)}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  photo: { width: 56, height: 56, borderRadius: radius.md },
  latest: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
});
