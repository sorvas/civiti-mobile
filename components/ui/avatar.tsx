import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BrandColors } from '@/constants/theme';
import { BorderRadius } from '@/constants/spacing';
import { useThemeColor } from '@/hooks/use-theme-color';

type AvatarProps = {
  uri?: string | null;
  name?: string;
  size?: number;
};

function getInitials(name: string): string {
  const result = name
    .split(' ')
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  return result || '?';
}

export function Avatar({ uri, name, size = 40 }: AvatarProps) {
  const backgroundColor = useThemeColor(
    { light: BrandColors.platinum, dark: BrandColors.oxfordBlue80 },
    'surface',
  );

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: BorderRadius.full,
    borderCurve: 'continuous' as const,
    backgroundColor,
  };

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.image, containerStyle]}
        contentFit="cover"
        transition={200}
        recyclingKey={uri}
        accessibilityRole="image"
        accessibilityLabel={name ?? 'Avatar'}
      />
    );
  }

  return (
    <View
      style={[styles.fallback, containerStyle]}
      accessibilityRole="image"
      accessibilityLabel={name ? `Avatar: ${name}` : 'Avatar'}
    >
      <ThemedText
        type="bodyBold"
        style={{ fontSize: size * 0.4, lineHeight: size * 0.5 }}
      >
        {name ? getInitials(name) : '?'}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    overflow: 'hidden',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
