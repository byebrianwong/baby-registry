import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View, type TextInputInstance } from "react-native";

import { Button, EmptyState, Field, haptic, Section, SwitchRow, Text } from "@/components/ui";
import { signUp } from "@/lib/auth";
import { errorMessage } from "@/lib/data";
import { SITE_URL } from "@/lib/supabase";
import { spacing, useTheme } from "@/lib/theme";

export default function SignUpScreen() {
  const theme = useTheme();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [findable, setFindable] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const emailRef = useRef<TextInputInstance>(null);
  const passwordRef = useRef<TextInputInstance>(null);

  async function submit() {
    if (!fullName.trim() || !email.trim()) {
      setError("Enter your name and email.");
      return;
    }
    if (password.length < 6) {
      setError("Use a password of at least 6 characters.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await signUp({ fullName, email, password, findable });
      haptic("success");
      // Signed in straight away when the project doesn't ask for email confirmation.
      if (result === "confirm") setCheckEmail(true);
    } catch (e) {
      haptic("warning");
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  if (checkEmail) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <EmptyState
          icon="checkCircle"
          title="Check your email"
          message={`We sent a link to ${email.trim()}. Open it to confirm your account, then sign in here.`}
          action={<Button title="Back to sign in" onPress={() => router.back()} />}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }} keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic">
        <Field
          label="Your name"
          value={fullName}
          onChangeText={setFullName}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
          submitBehavior="submit"
        />
        <Field
          ref={emailRef}
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          submitBehavior="submit"
        />
        <Field
          ref={passwordRef}
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          hint="At least 6 characters."
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        <Section>
          <SwitchRow
            icon="search"
            label="Let friends find me on Regibee"
            description="Signed-in people can find you by name, or by your email address if they already know it. Your email is never shown."
            value={findable}
            onValueChange={setFindable}
          />
        </Section>
        {error ? (
          <Text variant="footnote" tone="danger" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        <Button title="Create account" onPress={submit} loading={loading} />
        <Text variant="footnote" tone="secondary" style={{ textAlign: "center" }}>
          Our{" "}
          <Text
            variant="footnote"
            tone="tint"
            accessibilityRole="link"
            onPress={() => WebBrowser.openBrowserAsync(`${SITE_URL}/privacy`)}
          >
            privacy policy
          </Text>{" "}
          says what we keep and how to delete it.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
