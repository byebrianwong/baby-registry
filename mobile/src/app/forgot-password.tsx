import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";

import { AutofillFields } from "@/components/autofill-fields";
import { Button, EmptyState, Field, Text } from "@/components/ui";
import { sendPasswordReset } from "@/lib/auth";
import { errorMessage } from "@/lib/data";
import { spacing, useTheme } from "@/lib/theme";

export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit() {
    if (!email.trim()) {
      setError("Enter your email.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <EmptyState
          icon="checkCircle"
          title="Check your email"
          message="If there's an account for that address, we sent it a link to set a new password. Then sign in here with it."
          action={<Button title="Back to sign in" onPress={() => router.back()} />}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="automatic"
    >
      <Text variant="callout" tone="secondary">
        Enter the email you signed up with. We'll send you a link to set a new password.
      </Text>
      <AutofillFields>
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="send"
          onSubmitEditing={submit}
          autoFocus
        />
      </AutofillFields>
      {error ? (
        <Text variant="footnote" tone="danger">
          {error}
        </Text>
      ) : null}
      <Button title="Send reset link" onPress={submit} loading={loading} />
    </ScrollView>
  );
}
