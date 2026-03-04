import { useCallback, useMemo } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { LocationPreview } from '@/components/location-preview';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { CategoryBadge } from '@/components/ui/category-badge';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { UrgencyBadge } from '@/components/ui/urgency-badge';
import { WizardProgress } from '@/components/wizard-progress';
import { Localization } from '@/constants/localization';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCreateIssue } from '@/hooks/use-create-issue';
import { ApiError, AuthError, NetworkError } from '@/services/errors';
import { WIZARD_DRAFT_KEY } from '@/constants/storage-keys';
import { useWizard } from '@/store/wizard-context';
import type { CreateIssueRequest } from '@/types/issues';
const PHOTO_THUMB_SIZE = 80;
const MIN_DESCRIPTION_LENGTH = 50;

export default function CreateStep5() {
  const scheme = useColorScheme() ?? 'light';
  const insets = useSafeAreaInsets();
  const wizard = useWizard();
  const { mutate: submit, isPending } = useCreateIssue();

  const canSubmit = useMemo(
    () =>
      wizard.category != null &&
      wizard.title.trim().length > 0 &&
      wizard.description.trim().length >= MIN_DESCRIPTION_LENGTH &&
      wizard.address.trim().length > 0 &&
      wizard.latitude != null &&
      wizard.longitude != null &&
      wizard.district != null,
    [
      wizard.category,
      wizard.title,
      wizard.description,
      wizard.address,
      wizard.latitude,
      wizard.longitude,
      wizard.district,
    ],
  );

  const handleSubmit = useCallback(() => {
    if (isPending) return;

    if (
      wizard.category == null ||
      !wizard.title.trim() ||
      wizard.description.trim().length < MIN_DESCRIPTION_LENGTH ||
      !wizard.address.trim() ||
      wizard.latitude == null ||
      wizard.longitude == null ||
      !wizard.district
    ) {
      Alert.alert(Localization.wizard.missingRequired);
      return;
    }

    const request: CreateIssueRequest = {
      title: wizard.title.trim(),
      description: wizard.description.trim(),
      category: wizard.category,
      address: wizard.address.trim(),
      district: wizard.district,
      latitude: wizard.latitude,
      longitude: wizard.longitude,
      urgency: wizard.urgency,
      authorities: wizard.authorities.length > 0
        ? wizard.authorities.map((a) =>
            a.authorityId
              ? { authorityId: a.authorityId, customName: null, customEmail: null }
              : a,
          )
        : null,
      desiredOutcome: wizard.desiredOutcome.trim() || null,
      communityImpact: wizard.communityImpact.trim() || null,
      photoUrls: wizard.photoUrls.length > 0 ? wizard.photoUrls : null,
    };

    submit(request, {
      onSuccess: () => {
        AsyncStorage.removeItem(WIZARD_DRAFT_KEY).catch((err: unknown) => {
          console.warn('[review] Failed to remove draft after submit:', err);
        });
        router.replace('/create/success');
      },
      onError: (error) => {
        if (error instanceof ApiError) {
          console.warn(`[createIssue] Failed: ${error.status} ${error.message}`, error.requestId);
        } else {
          console.warn('[createIssue] Failed:', error);
        }
        if (error instanceof AuthError || (error instanceof ApiError && error.status === 401)) {
          Alert.alert(Localization.errors.noPermission);
          router.replace('/login');
        } else if (error instanceof NetworkError) {
          Alert.alert(Localization.errors.noConnection);
        } else if (error instanceof ApiError && error.status === 429) {
          Alert.alert(Localization.wizard.submitRateLimited);
        } else {
          Alert.alert(Localization.wizard.submitFailed);
        }
      },
    });
  }, [wizard, submit, isPending]);


  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Spacing.md },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={Localization.wizard.back}
        >
          <IconSymbol name="chevron.left" size={20} color={Colors[scheme].text} />
          <ThemedText type="caption">{Localization.wizard.back}</ThemedText>
        </Pressable>

        <WizardProgress currentStep={5} />
        <ThemedText type="h2">{Localization.wizard.step5Title}</ThemedText>
        <ThemedText type="caption" style={{ color: Colors[scheme].textSecondary }}>
          {Localization.wizard.step5Subtitle}
        </ThemedText>

        {/* Category */}
        {wizard.category ? (
          <Section label={Localization.filter.categoryLabel}>
            <CategoryBadge category={wizard.category} />
          </Section>
        ) : null}

        {/* Photos */}
        <Section label={Localization.wizard.sectionPhotos}>
          {wizard.photoUrls.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photoList}
            >
              {wizard.photoUrls.map((url, index) => (
                <Image
                  key={url}
                  source={{ uri: url }}
                  style={[
                    styles.photoThumb,
                    { borderColor: Colors[scheme].border },
                  ]}
                  contentFit="cover"
                  transition={200}
                  recyclingKey={url}
                  accessibilityLabel={`${Localization.wizard.sectionPhotos} ${index + 1}`}
                />
              ))}
            </ScrollView>
          ) : (
            <ThemedText type="caption" style={{ color: Colors[scheme].textSecondary }}>
              {Localization.wizard.noPhotos}
            </ThemedText>
          )}
        </Section>

        {/* Details */}
        <Section label={Localization.wizard.sectionDetails}>
          <ThemedText type="bodyBold">{wizard.title || '—'}</ThemedText>
          <ThemedText type="body" style={{ color: Colors[scheme].textSecondary }}>
            {wizard.description || '—'}
          </ThemedText>
          <UrgencyBadge level={wizard.urgency} />
        </Section>

        {/* Desired outcome */}
        {wizard.desiredOutcome.trim() ? (
          <Section label={Localization.detail.desiredOutcome}>
            <ThemedText type="body" style={{ color: Colors[scheme].textSecondary }}>
              {wizard.desiredOutcome}
            </ThemedText>
          </Section>
        ) : null}

        {/* Community impact */}
        {wizard.communityImpact.trim() ? (
          <Section label={Localization.detail.communityImpact}>
            <ThemedText type="body" style={{ color: Colors[scheme].textSecondary }}>
              {wizard.communityImpact}
            </ThemedText>
          </Section>
        ) : null}

        {/* Location */}
        <Section label={Localization.wizard.sectionLocation}>
          {wizard.latitude != null && wizard.longitude != null ? (
            <LocationPreview
              latitude={wizard.latitude}
              longitude={wizard.longitude}
              address={wizard.address || null}
            />
          ) : (
            <ThemedText type="caption" style={{ color: Colors[scheme].error }}>
              {Localization.wizard.noLocation}
            </ThemedText>
          )}
        </Section>

        {/* Authorities */}
        <Section label={Localization.wizard.sectionAuthorities}>
          {wizard.authorities.length > 0 ? (
            <View style={styles.authoritiesList}>
              {wizard.authorities.map((auth, index) => (
                <View
                  key={auth.authorityId ?? `custom-${index}`}
                  style={[
                    styles.authorityItem,
                    {
                      backgroundColor: Colors[scheme].surface,
                      borderColor: Colors[scheme].border,
                    },
                  ]}
                >
                  <IconSymbol
                    name="checkmark.circle.fill"
                    size={18}
                    color={Colors[scheme].tint}
                  />
                  <View style={styles.authorityContent}>
                    <ThemedText type="body" numberOfLines={1}>
                      {auth.customName ?? Localization.authority.defaultName}
                    </ThemedText>
                    {auth.customEmail ? (
                      <ThemedText
                        type="caption"
                        style={{ color: Colors[scheme].textSecondary }}
                        numberOfLines={1}
                      >
                        {auth.customEmail}
                      </ThemedText>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <ThemedText type="caption" style={{ color: Colors[scheme].textSecondary }}>
              {Localization.wizard.noAuthoritiesSelected}
            </ThemedText>
          )}
        </Section>
      </ScrollView>

      {/* Bottom bar */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: Colors[scheme].surface,
            borderTopColor: Colors[scheme].border,
            paddingBottom: Math.max(insets.bottom, Spacing.lg),
          },
        ]}
      >
        <Button
          title={Localization.actions.submitIssue}
          onPress={handleSubmit}
          disabled={!canSubmit || isPending}
          isLoading={isPending}
        />
      </View>
    </ThemedView>
  );
}

// ─── Section helper ────────────────────────────────────────────

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const scheme = useColorScheme() ?? 'light';

  return (
    <View style={[styles.section, { borderColor: Colors[scheme].border }]}>
      <ThemedText type="label" style={{ color: Colors[scheme].textSecondary }}>
        {label}
      </ThemedText>
      {children}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing['4xl'],
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
    minHeight: 44,
  },
  section: {
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  photoList: {
    gap: Spacing.sm,
  },
  photoThumb: {
    width: PHOTO_THUMB_SIZE,
    height: PHOTO_THUMB_SIZE,
    borderRadius: BorderRadius.sm,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  authoritiesList: {
    gap: Spacing.sm,
  },
  authorityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  authorityContent: {
    flex: 1,
    gap: Spacing.xxs,
  },
  bottomBar: {
    padding: Spacing.lg,
    gap: Spacing.sm,
    borderTopWidth: 1,
  },
});
