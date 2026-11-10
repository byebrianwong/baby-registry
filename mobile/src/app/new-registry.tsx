import DateTimePicker from "@react-native-community/datetimepicker";
import { router, Stack } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Chip, Divider, Field, IconButton, Section, SwitchRow, Text } from "@/components/ui";
import { errorMessage, useCreateRegistry } from "@/lib/data";
import { formatEventDate } from "@/lib/format";
import { EVENT_TYPES } from "@/lib/occasion";
import { spacing, useTheme } from "@/lib/theme";
import type { EventType, RegistryType } from "@/lib/types";

function toYmd(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export default function NewRegistryScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const create = useCreateRegistry();
  const [registryType, setRegistryType] = useState<RegistryType>("baby");
  const [eventType, setEventType] = useState<EventType>("birthday");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    if (!title.trim()) {
      setError("Give your registry a name.");
      return;
    }
    create.mutate(
      {
        title,
        registryType,
        eventType: registryType === "personal" ? eventType : null,
        eventDate: date ? toYmd(date) : null,
        isPublic,
      },
      {
        onSuccess: ({ id }) => {
          router.back();
          router.push({ pathname: "/registry/[id]", params: { id } });
        },
        onError: (e) => setError(errorMessage(e)),
      }
    );
  }

  const placeholder =
    registryType === "baby" ? "Baby Lee's registry" : eventType === "wedding" ? "Sam & Alex's wedding" : "Jordan's birthday";

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Stack.Screen
        options={{
          headerLeft:
            Platform.OS === "ios"
              ? () => <IconButton icon="close" accessibilityLabel="Cancel" onPress={() => router.back()} />
              : undefined,
        }}
      />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: spacing.sm }}>
          <Text variant="footnote" tone="secondary" style={{ fontWeight: "600" }}>
            What's it for?
          </Text>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <Chip label="A baby" selected={registryType === "baby"} onPress={() => setRegistryType("baby")} />
            <Chip label="Something else" selected={registryType === "personal"} onPress={() => setRegistryType("personal")} />
          </View>
          {registryType === "personal" ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.xs }}>
              {EVENT_TYPES.map((option) => (
                <Chip key={option.value} label={option.label} selected={eventType === option.value} onPress={() => setEventType(option.value)} />
              ))}
            </View>
          ) : (
            <Text variant="footnote" tone="tertiary">
              Baby registries start with 10 categories, like Nursery & Sleep and Feeding.
            </Text>
          )}
        </View>

        <Field label="Name" value={title} onChangeText={setTitle} placeholder={placeholder} autoCapitalize="words" returnKeyType="done" />

        <Section>
          <SwitchRow
            icon="calendar"
            label={date ? formatEventDate(toYmd(date))! : "Add a date"}
            description={registryType === "baby" ? "The due date or the shower." : "The day of the occasion."}
            value={Boolean(date) || showPicker}
            onValueChange={(on) => {
              if (on) {
                setDate(date ?? new Date());
                setShowPicker(true);
              } else {
                setDate(null);
                setShowPicker(false);
              }
            }}
          />
          {showPicker && date ? (
            <View style={{ alignItems: "center", paddingBottom: spacing.sm }}>
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                accentColor={theme.tint}
                themeVariant={theme.dark ? "dark" : "light"}
                onChange={(event, next) => {
                  if (Platform.OS === "android") setShowPicker(false);
                  if (event.type === "set" && next) setDate(next);
                  if (event.type === "dismissed" && Platform.OS === "android" && !next) return;
                }}
              />
            </View>
          ) : null}
          <Divider inset={52} />
          <SwitchRow
            icon="public"
            label="Public"
            description="Public registries can show up in search engines. Anyone with the link can always open it."
            value={isPublic}
            onValueChange={setIsPublic}
          />
        </Section>
      </ScrollView>
      <View style={{ padding: spacing.lg, paddingBottom: Math.max(insets.bottom, spacing.lg), gap: spacing.sm }}>
        {error ? (
          <Text variant="footnote" tone="danger" style={{ textAlign: "center" }}>
            {error}
          </Text>
        ) : null}
        <Button title="Create registry" onPress={submit} loading={create.isPending} />
      </View>
    </KeyboardAvoidingView>
  );
}
