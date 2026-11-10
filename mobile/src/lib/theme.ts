// Regibee's colors, from the website's tokens (src/styles/theme.css):
// teal brand, warm grays, and the bee's yellow.

import { useColorScheme } from "react-native";

const palette = {
  brand50: "#F0FAFC",
  brand100: "#DEF1F4",
  brand200: "#C3E3E8",
  brand300: "#9DC6D0",
  brand400: "#639CAD",
  brand500: "#2E7387",
  brand600: "#004659",
  brand700: "#003847",
  brand900: "#012029",
  gray25: "#FEFDFB",
  gray50: "#FDFAF6",
  gray100: "#F8F4EF",
  gray200: "#EEE9E4",
  gray300: "#DCD5CF",
  gray400: "#ADA5A0",
  gray500: "#7C746F",
  gray600: "#5E5652",
  gray700: "#4D4440",
  gray800: "#322926",
  gray900: "#231B18",
  gray950: "#110B0A",
  yellow100: "#FEF7C3",
  yellow400: "#FAC515",
  yellow700: "#A15C07",
  green: "#07C799",
  green700: "#067647",
  green50: "#ECFDF3",
  red: "#D92D20",
  red50: "#FEF3F2",
  white: "#FFFFFF",
};

export interface Theme {
  dark: boolean;
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  tint: string;
  tintSoft: string;
  onTint: string;
  accent: string;
  accentSoft: string;
  onAccentSoft: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  placeholder: string;
}

export const lightTheme: Theme = {
  dark: false,
  background: palette.gray50,
  surface: palette.white,
  surfaceAlt: palette.gray100,
  border: palette.gray200,
  text: palette.gray900,
  textSecondary: palette.gray600,
  textTertiary: palette.gray500,
  tint: palette.brand600,
  tintSoft: palette.brand50,
  onTint: palette.white,
  accent: palette.yellow400,
  accentSoft: palette.yellow100,
  onAccentSoft: palette.yellow700,
  success: palette.green700,
  successSoft: palette.green50,
  danger: palette.red,
  dangerSoft: palette.red50,
  placeholder: palette.gray400,
};

export const darkTheme: Theme = {
  dark: true,
  background: palette.gray950,
  surface: palette.gray900,
  surfaceAlt: palette.gray800,
  border: palette.gray700,
  text: palette.gray50,
  textSecondary: palette.gray400,
  textTertiary: palette.gray500,
  tint: palette.brand300,
  tintSoft: "#0B2A33",
  onTint: palette.brand900,
  accent: palette.yellow400,
  accentSoft: "#3A2E0A",
  onAccentSoft: palette.yellow400,
  success: palette.green,
  successSoft: "#0B2A20",
  danger: "#F97066",
  dangerSoft: "#3A1512",
  placeholder: palette.gray600,
};

export function useTheme(): Theme {
  return useColorScheme() === "dark" ? darkTheme : lightTheme;
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;

// Bricolage Grotesque for headings, like the website. Body text uses the
// system font, which reads best at small sizes on each platform.
export const fonts = {
  display: "BricolageGrotesque_700Bold",
  displayHeavy: "BricolageGrotesque_800ExtraBold",
  displayMedium: "BricolageGrotesque_600SemiBold",
} as const;
