import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Platform, View } from "react-native";

import { ItemEditor } from "@/components/item-editor";
import { Button, EmptyState, IconButton, LoadingState } from "@/components/ui";
import { useRegistries } from "@/lib/data";
import { rememberRegistry, useDefaultRegistry } from "@/lib/last-registry";
import { useTheme } from "@/lib/theme";

/** Add an item. Opened from a registry, or by a regibee://add?url=… link. */
export default function AddScreen() {
  const params = useLocalSearchParams<{ registryId?: string; url?: string; title?: string }>();
  const theme = useTheme();
  const registries = useRegistries();
  const fallback = useDefaultRegistry(registries.data, params.registryId);
  const [chosen, setChosen] = useState<string | null>(null);
  const registryId = chosen ?? fallback ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen
        options={{
          headerLeft:
            Platform.OS === "ios"
              ? () => <IconButton icon="close" accessibilityLabel="Cancel" onPress={() => router.back()} />
              : undefined,
        }}
      />
      {fallback === undefined ? (
        <LoadingState />
      ) : !registryId ? (
        <EmptyState
          icon="gift"
          title="Make a registry first"
          message="Items go on a registry. Create one, then add this."
          action={<Button title="Create a registry" icon="add" onPress={() => router.replace("/new-registry")} />}
        />
      ) : (
        <ItemEditor
          mode="add"
          registryId={registryId}
          // Opened from a registry, the item goes there. Opened from a link, the owner picks.
          registries={params.registryId ? undefined : registries.data}
          onRegistryChange={setChosen}
          initialLink={params.url ?? null}
          initialTitle={params.title ?? null}
          onDone={(result) => {
            if (result.type === "added") rememberRegistry(result.registryId);
            router.back();
          }}
        />
      )}
    </View>
  );
}
