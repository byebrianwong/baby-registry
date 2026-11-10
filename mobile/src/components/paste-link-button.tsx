import * as Clipboard from "expo-clipboard";
import { Platform } from "react-native";

import { Button } from "@/components/ui";
import { useTheme } from "@/lib/theme";

/**
 * Pastes a link from the clipboard. On iPhone it's Apple's own Paste button,
 * which pastes without the "Allow Paste" prompt.
 */
export function PasteLinkButton({ onPaste }: { onPaste: (text: string) => void }) {
  const theme = useTheme();

  if (Platform.OS === "ios" && Clipboard.isPasteButtonAvailable) {
    return (
      <Clipboard.ClipboardPasteButton
        acceptedContentTypes={["url", "plain-text"]}
        displayMode="iconAndLabel"
        cornerStyle="medium"
        backgroundColor={theme.tint}
        foregroundColor={theme.onTint}
        style={{ height: 44, width: 110 }}
        onPress={(data) => {
          if (data.type === "text" && data.text) onPaste(data.text);
        }}
      />
    );
  }

  return (
    <Button
      title="Paste"
      icon="paste"
      size="medium"
      onPress={async () => {
        try {
          const text = await Clipboard.getStringAsync();
          if (text) onPaste(text);
        } catch {
          // The browser preview can refuse clipboard access. The owner can still type.
        }
      }}
    />
  );
}
