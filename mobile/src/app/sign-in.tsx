import { Image } from "expo-image";
import { Link } from "expo-router";
import { useShareIntentContext } from "expo-share-intent";
import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View, type TextInputInstance } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { Button, Field, haptic, Text } from "@/components/ui";
import { signIn, useSession } from "@/lib/auth";
import { errorMessage } from "@/lib/data";
import { radius, spacing, useTheme } from "@/lib/theme";

export default function SignInScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { hasShareIntent } = useShareIntentContext();
  const { startDemo } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<TextInputInstance>(null);

  async function submit() {
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
      haptic("success");
    } catch (e) {
      haptic("warning");
      setError(/invalid login/i.test(errorMessage(e)) ? "That email and password don't match." : errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: spacing.xl,
          paddingTop: insets.top + spacing.xl,
          paddingBottom: insets.bottom + spacing.xl,
          gap: spacing.xl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: "center", gap: spacing.md }}>
          <Image source={require("@/assets/images/panda.png")} style={{ width: 88, height: 100 }} contentFit="contain" accessibilityIgnoresInvertColors />
          <Text variant="display" style={{ textAlign: "center" }}>
            Regibee
          </Text>
          <Text variant="callout" tone="secondary" style={{ textAlign: "center" }}>
            One registry, every store.
          </Text>
        </View>

        {hasShareIntent ? (
          <View style={{ flexDirection: "row", gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: theme.tintSoft }}>
            <Icon name="link" size={16} color={theme.tint} />
            <Text variant="footnote" style={{ flex: 1, color: theme.tint }}>
              Sign in and we'll add what you shared.
            </Text>
          </View>
        ) : null}

        <View style={{ gap: spacing.lg }}>
          <Field
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
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
          />
          {error ? (
            <Text variant="footnote" tone="danger" accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}
          <Button title="Sign in" onPress={submit} loading={loading} />
          <Link href="/forgot-password" style={{ alignSelf: "center", padding: spacing.sm }}>
            <Text variant="subhead" tone="tint">
              Forgot your password?
            </Text>
          </Link>
        </View>

        <View style={{ alignItems: "center", gap: spacing.sm }}>
          <Text variant="subhead" tone="secondary">
            New to Regibee?
          </Text>
          <Link href="/sign-up" asChild>
            <Button title="Create an account" variant="secondary" style={{ alignSelf: "stretch" }} />
          </Link>
          {!hasShareIntent ? (
            <Button title="Look around first" variant="ghost" onPress={startDemo} accessibilityLabel="Look around a sample registry first" />
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
