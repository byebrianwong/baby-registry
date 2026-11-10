// The app's building blocks, styled with Regibee's colors and fonts.

import * as Haptics from "expo-haptics";
import { forwardRef, type ReactNode } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text as RNText,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputInstance,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { Icon, type IconName } from "@/components/icon";
import { fonts, radius, spacing, useTheme } from "@/lib/theme";

export function haptic(kind: "tap" | "success" | "warning" = "tap") {
  if (Platform.OS === "web") return;
  if (kind === "success") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else if (kind === "warning") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  else Haptics.selectionAsync();
}

type TextVariant = "display" | "title" | "headline" | "body" | "callout" | "subhead" | "footnote" | "caption";

const textStyles: Record<TextVariant, TextStyle> = {
  display: { fontFamily: fonts.displayHeavy, fontSize: 32, lineHeight: 38, letterSpacing: -0.5 },
  title: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28, letterSpacing: -0.2 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: "600" },
  body: { fontSize: 17, lineHeight: 23 },
  callout: { fontSize: 16, lineHeight: 21 },
  subhead: { fontSize: 15, lineHeight: 20 },
  footnote: { fontSize: 13, lineHeight: 18 },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: "500" },
};

export function Text({
  variant = "body",
  tone = "primary",
  style,
  ...props
}: TextProps & { variant?: TextVariant; tone?: "primary" | "secondary" | "tertiary" | "tint" | "danger" | "success" }) {
  const theme = useTheme();
  const color = {
    primary: theme.text,
    secondary: theme.textSecondary,
    tertiary: theme.textTertiary,
    tint: theme.tint,
    danger: theme.danger,
    success: theme.success,
  }[tone];
  return <RNText {...props} style={[textStyles[variant], { color }, style]} />;
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  title,
  onPress,
  variant = "primary",
  icon,
  loading,
  disabled,
  size = "large",
  style,
  accessibilityLabel,
}: {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  size?: "large" | "medium" | "small";
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  const colors = {
    primary: { bg: theme.tint, fg: theme.onTint, border: theme.tint },
    secondary: { bg: theme.surface, fg: theme.text, border: theme.border },
    ghost: { bg: "transparent", fg: theme.tint, border: "transparent" },
    danger: { bg: theme.dangerSoft, fg: theme.danger, border: theme.dangerSoft },
  }[variant];
  const height = { large: 52, medium: 44, small: 36 }[size];
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: Boolean(inactive), busy: Boolean(loading) }}
      disabled={inactive}
      onPress={() => {
        haptic();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.button,
        {
          height,
          backgroundColor: colors.bg,
          borderColor: colors.border,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
          paddingHorizontal: size === "small" ? spacing.md : spacing.lg,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={size === "small" ? 15 : 18} color={colors.fg} weight="semibold" /> : null}
          <RNText style={[styles.buttonText, { color: colors.fg, fontSize: size === "small" ? 15 : 17 }]}>{title}</RNText>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  color,
  size = 22,
}: {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  color?: string;
  size?: number;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={10}
      onPress={() => {
        haptic();
        onPress();
      }}
      style={({ pressed }) => ({ padding: 6, opacity: pressed ? 0.5 : 1 })}
    >
      <Icon name={icon} size={size} color={color ?? theme.tint} />
    </Pressable>
  );
}

export function Card({ children, style, ...props }: { children: ReactNode; style?: StyleProp<ViewStyle> } & PressableProps) {
  const theme = useTheme();
  const body = [styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, style];
  if (!props.onPress) return <View style={body}>{children}</View>;
  return (
    <Pressable {...props} style={({ pressed }) => [body, { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] }]}>
      {children}
    </Pressable>
  );
}

export function Pill({
  label,
  tone = "neutral",
  icon,
}: {
  label: string;
  tone?: "neutral" | "tint" | "accent" | "success" | "danger";
  icon?: IconName;
}) {
  const theme = useTheme();
  const colors = {
    neutral: { bg: theme.surfaceAlt, fg: theme.textSecondary },
    tint: { bg: theme.tintSoft, fg: theme.tint },
    accent: { bg: theme.accentSoft, fg: theme.onAccentSoft },
    success: { bg: theme.successSoft, fg: theme.success },
    danger: { bg: theme.dangerSoft, fg: theme.danger },
  }[tone];
  return (
    <View style={[styles.pill, { backgroundColor: colors.bg }]}>
      {icon ? <Icon name={icon} size={11} color={colors.fg} weight="bold" /> : null}
      <RNText style={[styles.pillText, { color: colors.fg }]}>{label}</RNText>
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        haptic();
        onPress();
      }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? theme.tint : theme.surface,
          borderColor: selected ? theme.tint : theme.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <RNText style={{ color: selected ? theme.onTint : theme.text, fontSize: 15, fontWeight: "500" }}>{label}</RNText>
    </Pressable>
  );
}

export const Field = forwardRef<
  TextInputInstance,
  TextInputProps & { label?: string; hint?: string; error?: string | null; leading?: ReactNode; trailing?: ReactNode }
>(function Field({ label, hint, error, leading, trailing, style, ...props }, ref) {
  const theme = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <Text variant="footnote" tone="secondary" style={{ fontWeight: "600" }}>
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.field,
          { backgroundColor: theme.surface, borderColor: error ? theme.danger : theme.border },
          props.multiline ? { minHeight: 88, alignItems: "flex-start", paddingVertical: 12 } : null,
        ]}
      >
        {leading}
        <TextInput
          ref={ref}
          placeholderTextColor={theme.placeholder}
          selectionColor={theme.tint}
          {...props}
          style={[{ flex: 1, color: theme.text, fontSize: 17, paddingVertical: 0 }, props.multiline ? { textAlignVertical: "top" } : null, style]}
        />
        {trailing}
      </View>
      {error ? (
        <Text variant="footnote" tone="danger">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="footnote" tone="tertiary">
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

export function SwitchRow({
  label,
  description,
  value,
  onValueChange,
  icon,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  icon?: IconName;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => {
        haptic();
        onValueChange(!value);
      }}
      style={styles.row}
    >
      {icon ? <Icon name={icon} size={20} color={theme.tint} /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="callout">{label}</Text>
        {description ? (
          <Text variant="footnote" tone="tertiary">
            {description}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={(next) => {
          haptic();
          onValueChange(next);
        }}
        trackColor={{ true: theme.tint, false: theme.border }}
        thumbColor={Platform.OS === "android" ? theme.surface : undefined}
      />
    </Pressable>
  );
}

export function Stepper({ value, onChange, min = 1, max = 99 }: { value: number; onChange: (value: number) => void; min?: number; max?: number }) {
  const theme = useTheme();
  const step = (delta: number) => {
    const next = Math.min(max, Math.max(min, value + delta));
    if (next !== value) {
      haptic();
      onChange(next);
    }
  };
  return (
    <View style={[styles.stepper, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      <Pressable accessibilityLabel="Fewer" accessibilityRole="button" onPress={() => step(-1)} hitSlop={6} style={styles.stepperButton}>
        <Icon name="minus" size={16} color={value <= min ? theme.placeholder : theme.tint} weight="bold" />
      </Pressable>
      <RNText accessibilityLiveRegion="polite" style={{ color: theme.text, fontSize: 17, fontWeight: "600", minWidth: 28, textAlign: "center" }}>
        {value}
      </RNText>
      <Pressable accessibilityLabel="More" accessibilityRole="button" onPress={() => step(1)} hitSlop={6} style={styles.stepperButton}>
        <Icon name="add" size={16} color={value >= max ? theme.placeholder : theme.tint} weight="bold" />
      </Pressable>
    </View>
  );
}

export function Section({ title, children, footer }: { title?: string; children: ReactNode; footer?: string }) {
  const theme = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      {title ? (
        <Text variant="footnote" tone="secondary" style={{ fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4, marginLeft: 4 }}>
          {title}
        </Text>
      ) : null}
      <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>{children}</View>
      {footer ? (
        <Text variant="footnote" tone="tertiary" style={{ marginLeft: 4 }}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

export function Divider({ inset = 0 }: { inset?: number }) {
  const theme = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.border, marginLeft: inset }} />;
}

export function ProgressBar({ value, color }: { value: number; color?: string }) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={{ height: 6, borderRadius: 3, backgroundColor: theme.surfaceAlt, overflow: "hidden" }}
    >
      <View style={{ width: `${clamped * 100}%`, height: "100%", borderRadius: 3, backgroundColor: color ?? theme.tint }} />
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: IconName;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.accentSoft }]}>
        <Icon name={icon} size={30} color={theme.onAccentSoft} />
      </View>
      <Text variant="title" style={{ textAlign: "center" }}>
        {title}
      </Text>
      {message ? (
        <Text variant="callout" tone="secondary" style={{ textAlign: "center", maxWidth: 320 }}>
          {message}
        </Text>
      ) : null}
      {action ? <View style={{ marginTop: spacing.sm, alignSelf: "stretch", alignItems: "center" }}>{action}</View> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <EmptyState
      icon="error"
      title="Couldn't load this"
      message={message}
      action={onRetry ? <Button title="Try again" icon="refresh" variant="secondary" onPress={onRetry} size="medium" /> : null}
    />
  );
}

export function LoadingState() {
  const theme = useTheme();
  return (
    <View style={styles.empty}>
      <ActivityIndicator color={theme.tint} />
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  buttonText: { fontWeight: "600" },
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.md,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
  pillText: { fontSize: 12, fontWeight: "600" },
  chip: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 52,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radius.pill,
    height: 40,
  },
  stepperButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  section: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.xxl,
    minHeight: 280,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
});
