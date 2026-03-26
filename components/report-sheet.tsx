import { forwardRef, useCallback, useImperativeHandle, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Localization } from '@/constants/localization';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { ReportReason } from '@/types/reports';

const REASONS: ReportReason[] = [
  'Spam',
  'Harassment',
  'Inappropriate',
  'Misinformation',
  'Other',
];

export type ReportTarget =
  | { type: 'issue'; id: string }
  | { type: 'comment'; id: string };

export type ReportSheetRef = {
  open: (target: ReportTarget) => void;
  close: () => void;
};

type ReportSheetProps = {
  onSubmit: (target: ReportTarget, reason: ReportReason, details: string | null) => void;
  isSubmitting?: boolean;
  onClose?: () => void;
};

export const ReportSheet = forwardRef<ReportSheetRef, ReportSheetProps>(
  function ReportSheet({ onSubmit, isSubmitting, onClose }, ref) {
    const [visible, setVisible] = useState(false);
    const [target, setTarget] = useState<ReportTarget | null>(null);
    const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
    const [details, setDetails] = useState('');
    const insets = useSafeAreaInsets();

    const textColor = useThemeColor({}, 'text');
    const textSecondary = useThemeColor({}, 'textSecondary');
    const accent = useThemeColor({}, 'accent');
    const border = useThemeColor({}, 'border');
    const surface = useThemeColor({}, 'surface');
    const background = useThemeColor({}, 'background');

    useImperativeHandle(ref, () => ({
      open: (t: ReportTarget) => {
        setTarget(t);
        setSelectedReason(null);
        setDetails('');
        setVisible(true);
      },
      close: () => {
        setVisible(false);
      },
    }));

    const handleDismiss = useCallback(() => {
      if (isSubmitting) return;
      setVisible(false);
      onClose?.();
      setSelectedReason(null);
      setDetails('');
      setTarget(null);
    }, [isSubmitting, onClose]);

    const handleSubmit = useCallback(() => {
      if (!target || !selectedReason || isSubmitting) return;
      onSubmit(target, selectedReason, details.trim() || null);
    }, [target, selectedReason, details, onSubmit, isSubmitting]);

    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={handleDismiss}
      >
        <Pressable style={styles.backdrop} onPress={handleDismiss}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardView}
          >
            <Pressable
              style={[
                styles.sheet,
                {
                  backgroundColor: surface,
                  paddingBottom: Math.max(insets.bottom, Spacing.lg),
                },
              ]}
              onPress={() => {}}
            >
              <View style={styles.handle}>
                <View style={[styles.handleBar, { backgroundColor: border }]} />
              </View>

              <View style={styles.content}>
                <ThemedText type="h3">{Localization.report.title}</ThemedText>

                <ThemedText type="bodyBold">{Localization.report.reasonLabel}</ThemedText>
                <View accessibilityRole="radiogroup" accessibilityLabel={Localization.report.reasonLabel}>
                  {REASONS.map((reason) => (
                    <Pressable
                      key={reason}
                      onPress={() => setSelectedReason(reason)}
                      style={styles.reasonRow}
                      hitSlop={4}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: selectedReason === reason }}
                    >
                      <IconSymbol
                        name={selectedReason === reason ? 'checkmark.circle.fill' : 'circle'}
                        size={20}
                        color={selectedReason === reason ? accent : textSecondary}
                      />
                      <ThemedText type="body">
                        {Localization.report.reasons[reason]}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>

                <TextInput
                  style={[
                    styles.detailsInput,
                    { color: textColor, borderColor: border, backgroundColor: background },
                  ]}
                  placeholder={Localization.report.detailsPlaceholder}
                  placeholderTextColor={textSecondary}
                  value={details}
                  onChangeText={setDetails}
                  multiline
                  maxLength={500}
                />

                <Button
                  variant="primary"
                  title={Localization.report.submit}
                  onPress={handleSubmit}
                  disabled={!selectedReason || isSubmitting}
                  isLoading={isSubmitting}
                />
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    );
  },
);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    borderCurve: 'continuous',
  },
  handle: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 44,
    paddingVertical: Spacing.xs,
  },
  detailsInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    borderCurve: 'continuous',
    padding: Spacing.md,
    fontSize: 16,
    lineHeight: 24,
    height: 80,
    textAlignVertical: 'top',
  },
});
