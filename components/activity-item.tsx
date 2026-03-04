import { memo, type ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BorderRadius, Shadows, Spacing } from '@/constants/spacing';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { ActivityResponse } from '@/types/activity';
import { ActivityType } from '@/types/enums';
import { formatTimeAgo } from '@/utils/format-time-ago';

type ActivityItemProps = {
  activity: ActivityResponse;
  onPress: (issueId: string) => void;
};

type IconConfig = {
  name: ComponentProps<typeof IconSymbol>['name'];
  colorToken: 'accent' | 'info' | 'success' | 'textSecondary';
};

const ICON_MAP: Record<ActivityType, IconConfig> = {
  [ActivityType.NewSupporters]: { name: 'person.2.fill', colorToken: 'accent' },
  [ActivityType.StatusChange]: { name: 'arrow.clockwise', colorToken: 'info' },
  [ActivityType.IssueApproved]: { name: 'checkmark.circle.fill', colorToken: 'success' },
  [ActivityType.IssueResolved]: { name: 'checkmark.circle.fill', colorToken: 'success' },
  [ActivityType.IssueCreated]: { name: 'plus.circle.fill', colorToken: 'accent' },
  [ActivityType.NewComment]: { name: 'text.bubble.fill', colorToken: 'textSecondary' },
};

export const ActivityItem = memo(function ActivityItem({ activity, onPress }: ActivityItemProps) {
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');

  const icon = ICON_MAP[activity.type] ?? ICON_MAP[ActivityType.IssueCreated];
  const iconColor = useThemeColor({}, icon.colorToken);

  const message = activity.message ?? '';

  return (
    <Pressable
      onPress={() => {
        if (activity.issueId) onPress(activity.issueId);
      }}
      accessibilityRole="button"
      accessibilityLabel={message}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: surface, borderColor: border, opacity: pressed ? 0.9 : 1 },
        Shadows.sm,
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: border }]}>
        <IconSymbol name={icon.name} size={18} color={iconColor} />
      </View>

      <View style={styles.content}>
        <ThemedText type="body" numberOfLines={3}>
          {message}
        </ThemedText>

        <ThemedText
          type="caption"
          style={[styles.time, { color: textSecondary }]}
        >
          {formatTimeAgo(activity.createdAt)}
        </ThemedText>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: Spacing.xs,
  },
  time: {
    alignSelf: 'flex-end',
  },
});
