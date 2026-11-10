import { router, Stack } from "expo-router";
import { FlatList, RefreshControl, View } from "react-native";

import { RegistryCard } from "@/components/registry-card";
import { Button, EmptyState, ErrorState, IconButton, LoadingState, Text } from "@/components/ui";
import { errorMessage, useRegistries } from "@/lib/data";
import { spacing, useTheme } from "@/lib/theme";

export default function RegistriesScreen() {
  const theme = useTheme();
  const registries = useRegistries();

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <IconButton icon="add" accessibilityLabel="New registry" onPress={() => router.push("/new-registry")} />
          ),
        }}
      />
      <FlatList
        data={registries.data ?? []}
        keyExtractor={(r) => r.id}
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={registries.isRefetching}
            onRefresh={() => {
              registries.refetch();
            }}
            tintColor={theme.tint}
          />
        }
        ListHeaderComponent={
          registries.data && registries.data.length > 0 ? (
            <Text variant="subhead" tone="secondary" style={{ marginBottom: spacing.xs }}>
              Share a product to Regibee from any store's app to add it here.
            </Text>
          ) : undefined
        }
        renderItem={({ item }) => (
          <RegistryCard
            registry={item}
            onPress={() => router.push({ pathname: "/registry/[id]", params: { id: item.id } })}
          />
        )}
        ListEmptyComponent={
          registries.isPending ? (
            <LoadingState />
          ) : registries.isError ? (
            <ErrorState message={errorMessage(registries.error)} onRetry={() => registries.refetch()} />
          ) : (
            <EmptyState
              icon="gift"
              title="Start your first registry"
              message="Add things from any store, then share one link with friends and family."
              action={
                <View style={{ width: "100%", maxWidth: 320 }}>
                  <Button title="Create a registry" icon="add" onPress={() => router.push("/new-registry")} />
                </View>
              }
            />
          )
        }
      />
    </>
  );
}
