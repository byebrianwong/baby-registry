import { Image } from "expo-image";
import { useState } from "react";
import { View } from "react-native";

import { Icon } from "@/components/icon";
import { radius, useTheme } from "@/lib/theme";

/** A product picture, or a gift icon when there's none or it won't load (store picture links expire). */
export function ItemImage({ uri, size, rounded = radius.md }: { uri: string | null | undefined; size: number; rounded?: number }) {
  const theme = useTheme();
  const [failed, setFailed] = useState<string | null>(null);

  if (!uri || failed === uri) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: rounded,
          backgroundColor: theme.surfaceAlt,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="gift" size={size * 0.4} color={theme.textTertiary} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: rounded, backgroundColor: theme.dark ? theme.surfaceAlt : "#FFFFFF" }}
      contentFit="contain"
      transition={150}
      cachePolicy="memory-disk"
      recyclingKey={uri}
      onError={() => setFailed(uri)}
      accessibilityIgnoresInvertColors
    />
  );
}
