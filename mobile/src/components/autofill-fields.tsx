import { useNavigation } from "expo-router";
import type { NativeStackNavigationProp } from "expo-router/native-stack";
import { Fragment, useEffect, useState, type ReactNode } from "react";
import { Platform } from "react-native";

// How long to wait for the screen's appear event before remounting anyway.
// The first screen at launch has no transition, so it may not send one.
const FALLBACK_MS = 500;

/**
 * Wraps sign-in fields so that password managers on Android, 1Password and
 * Google's included, offer to fill them.
 *
 * On Android, fields that mount together with their screen are missing from
 * what Android sends the password manager when one is tapped. It finds nothing
 * to fill and shows nothing, or "Content can't be autofilled". Fields mounted
 * after the screen is showing work. This is react-native-screens issue 3130,
 * still open. So on Android this mounts its fields again each time the screen
 * finishes appearing. Keep the fields' values in state so they carry over.
 */
export function AutofillFields({ children }: { children: ReactNode }) {
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, object | undefined>>>();
  const [mount, setMount] = useState(0);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    let appeared = false;
    const unsubscribe = navigation.addListener("transitionEnd", (event) => {
      if (event.data.closing) return;
      appeared = true;
      setMount((n) => n + 1);
    });
    const fallback = setTimeout(() => {
      if (!appeared) setMount((n) => n + 1);
    }, FALLBACK_MS);
    return () => {
      unsubscribe();
      clearTimeout(fallback);
    };
  }, [navigation]);

  return <Fragment key={mount}>{children}</Fragment>;
}
