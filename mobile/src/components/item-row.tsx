import { Link, router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { memo } from "react";
import { Alert, Platform, Pressable, StyleSheet, View } from "react-native";

import { Icon } from "@/components/icon";
import { ItemImage } from "@/components/item-image";
import { haptic, Pill, Text } from "@/components/ui";
import { formatPrice } from "@/lib/format";
import { storeLabel } from "@/lib/product";
import { spacing, useTheme } from "@/lib/theme";
import type { Item } from "@/lib/types";

export interface ItemActions {
  toggleMostWanted: (item: Item) => void;
  toggleBought: (item: Item) => void;
  remove: (item: Item) => void;
}

function status(item: Item): { label: string; tone: "neutral" | "tint" | "success" } {
  if (item.is_parent_purchased) return { label: "You bought it", tone: "success" };
  if (item.quantity_fulfilled >= item.quantity_needed) return { label: "All given", tone: "success" };
  if (item.quantity_fulfilled > 0) return { label: `${item.quantity_fulfilled} of ${item.quantity_needed} given`, tone: "tint" };
  return { label: item.quantity_needed > 1 ? `Wants ${item.quantity_needed}` : "Not given yet", tone: "neutral" };
}

function openLink(item: Item) {
  if (item.external_url) WebBrowser.openBrowserAsync(item.external_url);
}

/** Long-press options on Android, where there's no native link menu. */
function showActions(item: Item, actions: ItemActions) {
  haptic();
  Alert.alert(item.title, undefined, [
    { text: item.is_essential ? "Remove from most wanted" : "Mark most wanted", onPress: () => actions.toggleMostWanted(item) },
    { text: item.is_parent_purchased ? "I haven't bought it" : "I bought it myself", onPress: () => actions.toggleBought(item) },
    ...(item.external_url ? [{ text: "Open store page", onPress: () => openLink(item) }] : []),
    { text: "Delete", style: "destructive" as const, onPress: () => actions.remove(item) },
    { text: "Cancel", style: "cancel" as const },
  ]);
}

export const ItemRow = memo(function ItemRow({ item, actions }: { item: Item; actions: ItemActions }) {
  const theme = useTheme();
  const s = status(item);
  const store = storeLabel(item.external_url);
  const href = { pathname: "/item/[id]", params: { id: item.id } } as const;

  const ios = Platform.OS === "ios";
  const content = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title}${item.price ? `, ${formatPrice(item.price)}` : ""}, ${s.label}${item.is_essential ? ", most wanted" : ""}`}
      accessibilityHint="Opens the item to edit it"
      // On iPhone the Link below opens it and adds the long-press menu.
      onPress={ios ? undefined : () => router.push(href)}
      onLongPress={ios ? undefined : () => showActions(item, actions)}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? theme.surfaceAlt : theme.surface }]}
    >
      <ItemImage uri={item.image_url} size={64} />
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: "row", gap: 6, alignItems: "flex-start" }}>
          {item.is_essential ? (
            <View style={{ paddingTop: 2 }}>
              <Icon name="star" size={14} color={theme.accent} />
            </View>
          ) : null}
          <Text variant="subhead" numberOfLines={2} style={{ flex: 1, fontWeight: "500" }}>
            {item.title}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {item.price ? (
            <Text variant="footnote" style={{ fontWeight: "600" }}>
              {formatPrice(item.price)}
            </Text>
          ) : null}
          {store ? (
            <Text variant="footnote" tone="tertiary" numberOfLines={1} style={{ flexShrink: 1 }}>
              {store}
            </Text>
          ) : null}
        </View>
        <Pill label={s.label} tone={s.tone} />
      </View>
    </Pressable>
  );

  if (!ios) return content;

  return (
    <Link href={href} asChild>
      <Link.Trigger>{content}</Link.Trigger>
      <Link.Menu>
        <Link.MenuAction
          title={item.is_essential ? "Remove from most wanted" : "Mark most wanted"}
          icon={item.is_essential ? "star.slash" : "star"}
          onPress={() => actions.toggleMostWanted(item)}
        />
        <Link.MenuAction
          title={item.is_parent_purchased ? "I haven't bought it" : "I bought it myself"}
          icon={item.is_parent_purchased ? "arrow.uturn.backward" : "checkmark.circle"}
          onPress={() => actions.toggleBought(item)}
        />
        {item.external_url ? <Link.MenuAction title="Open store page" icon="safari" onPress={() => openLink(item)} /> : null}
        <Link.MenuAction title="Delete" icon="trash" destructive onPress={() => actions.remove(item)} />
      </Link.Menu>
    </Link>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
});
