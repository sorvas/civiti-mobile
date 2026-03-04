import AsyncStorage from '@react-native-async-storage/async-storage';
import type { IssueCategory, UrgencyLevel } from '@/constants/enums';
import { UrgencyLevel as UrgencyLevelEnum } from '@/constants/enums';
import { WIZARD_DRAFT_KEY } from '@/constants/storage-keys';
import type { IssueAuthorityInput } from '@/types/issues';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

const MAX_PHOTOS = 7;
const AUTO_SAVE_DEBOUNCE_MS = 1000;

// ─── Draft type & validation ────────────────────────────────────

export type WizardDraft = {
  category: IssueCategory | null;
  photoUrls: string[];
  title: string;
  description: string;
  urgency: UrgencyLevel;
  desiredOutcome: string;
  communityImpact: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  district: string | null;
  authorities: IssueAuthorityInput[];
  lastCompletedStep: number;
  savedAt: string;
};

export function isValidDraft(raw: unknown): raw is WizardDraft {
  if (raw == null || typeof raw !== 'object') return false;
  const d = raw as Record<string, unknown>;
  return (
    (d.category === null || typeof d.category === 'string') &&
    typeof d.title === 'string' &&
    typeof d.description === 'string' &&
    typeof d.urgency === 'string' &&
    typeof d.desiredOutcome === 'string' &&
    typeof d.communityImpact === 'string' &&
    typeof d.address === 'string' &&
    (d.latitude === null || typeof d.latitude === 'number') &&
    (d.longitude === null || typeof d.longitude === 'number') &&
    (d.district === null || typeof d.district === 'string') &&
    Array.isArray(d.photoUrls) && d.photoUrls.every((url) => typeof url === 'string') &&
    Array.isArray(d.authorities) &&
    typeof d.lastCompletedStep === 'number' &&
    Number.isFinite(d.lastCompletedStep) &&
    typeof d.savedAt === 'string'
  );
}

// ─── Context type ───────────────────────────────────────────────

type WizardContextValue = {
  // Step 1
  category: IssueCategory | null;
  setCategory: (category: IssueCategory) => void;
  // Step 2
  photoUrls: string[];
  addPhotoUrl: (url: string) => void;
  removePhotoUrl: (url: string) => void;
  // Step 3
  title: string;
  setTitle: (title: string) => void;
  description: string;
  setDescription: (description: string) => void;
  urgency: UrgencyLevel;
  setUrgency: (urgency: UrgencyLevel) => void;
  desiredOutcome: string;
  setDesiredOutcome: (desiredOutcome: string) => void;
  communityImpact: string;
  setCommunityImpact: (communityImpact: string) => void;
  address: string;
  setAddress: (address: string) => void;
  latitude: number | null;
  longitude: number | null;
  district: string | null;
  setLocation: (lat: number, lng: number, district: string | null, address: string) => void;
  // Step 4
  authorities: IssueAuthorityInput[];
  setAuthorities: (authorities: IssueAuthorityInput[]) => void;
  // Draft support
  lastCompletedStep: number;
  setLastCompletedStep: (step: number) => void;
  restoreFromDraft: (draft: WizardDraft) => void;
  // Global
  reset: () => void;
};

const WizardContext = createContext<WizardContextValue | null>(null);

export function WizardProvider({ children }: { children: ReactNode }) {
  // Step 1
  const [category, setCategoryState] = useState<IssueCategory | null>(null);
  // Step 2
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  // Step 3
  const [title, setTitleState] = useState('');
  const [description, setDescriptionState] = useState('');
  const [urgency, setUrgencyState] = useState<UrgencyLevel>(UrgencyLevelEnum.Medium);
  const [desiredOutcome, setDesiredOutcomeState] = useState('');
  const [communityImpact, setCommunityImpactState] = useState('');
  const [address, setAddressState] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [district, setDistrict] = useState<string | null>(null);
  // Step 4
  const [authorities, setAuthoritiesState] = useState<IssueAuthorityInput[]>([]);
  // Draft tracking
  const [lastCompletedStep, setLastCompletedStepState] = useState(0);

  // Skip the next auto-save cycle after restoreFromDraft (prevents overwriting the draft we just read)
  const skipNextAutoSaveRef = useRef(false);

  // Step 1 setters
  const setCategory = useCallback((value: IssueCategory) => {
    setCategoryState(value);
  }, []);

  // Step 2 setters
  const addPhotoUrl = useCallback((url: string) => {
    setPhotoUrls((prev) => (prev.length >= MAX_PHOTOS ? prev : [...prev, url]));
  }, []);

  const removePhotoUrl = useCallback((url: string) => {
    setPhotoUrls((prev) => prev.filter((u) => u !== url));
  }, []);

  // Step 3 setters
  const setTitle = useCallback((value: string) => setTitleState(value), []);
  const setDescription = useCallback((value: string) => setDescriptionState(value), []);
  const setUrgency = useCallback((value: UrgencyLevel) => setUrgencyState(value), []);
  const setDesiredOutcome = useCallback((value: string) => setDesiredOutcomeState(value), []);
  const setCommunityImpact = useCallback((value: string) => setCommunityImpactState(value), []);
  const setAddress = useCallback((value: string) => setAddressState(value), []);

  const setLocation = useCallback(
    (lat: number, lng: number, dist: string | null, addr: string) => {
      setLatitude(lat);
      setLongitude(lng);
      setDistrict(dist);
      setAddressState(addr);
    },
    [],
  );

  // Step 4 setters
  const setAuthorities = useCallback(
    (value: IssueAuthorityInput[]) => setAuthoritiesState(value),
    [],
  );

  // Draft tracking setter
  const setLastCompletedStep = useCallback(
    (step: number) => setLastCompletedStepState(step),
    [],
  );

  // Restore all wizard fields from a parsed draft
  const restoreFromDraft = useCallback((draft: WizardDraft) => {
    skipNextAutoSaveRef.current = true;
    setCategoryState(draft.category);
    setPhotoUrls(draft.photoUrls);
    setTitleState(draft.title);
    setDescriptionState(draft.description);
    setUrgencyState(draft.urgency);
    setDesiredOutcomeState(draft.desiredOutcome);
    setCommunityImpactState(draft.communityImpact);
    setAddressState(draft.address);
    setLatitude(draft.latitude);
    setLongitude(draft.longitude);
    setDistrict(draft.district);
    setAuthoritiesState(draft.authorities);
    setLastCompletedStepState(draft.lastCompletedStep);
  }, []);

  const reset = useCallback(() => {
    setCategoryState(null);
    setPhotoUrls([]);
    setTitleState('');
    setDescriptionState('');
    setUrgencyState(UrgencyLevelEnum.Medium);
    setDesiredOutcomeState('');
    setCommunityImpactState('');
    setAddressState('');
    setLatitude(null);
    setLongitude(null);
    setDistrict(null);
    setAuthoritiesState([]);
    setLastCompletedStepState(0);
    AsyncStorage.removeItem(WIZARD_DRAFT_KEY).catch((err: unknown) => {
      console.warn('[wizard] Failed to remove draft:', err);
    });
  }, []);

  // ─── Auto-save debounced ────────────────────────────────────

  useEffect(() => {
    if (category == null) return;
    if (skipNextAutoSaveRef.current) {
      skipNextAutoSaveRef.current = false;
      return;
    }

    const timer = setTimeout(() => {
      const draft: WizardDraft = {
        category,
        photoUrls,
        title,
        description,
        urgency,
        desiredOutcome,
        communityImpact,
        address,
        latitude,
        longitude,
        district,
        authorities,
        lastCompletedStep,
        savedAt: new Date().toISOString(),
      };
      AsyncStorage.setItem(WIZARD_DRAFT_KEY, JSON.stringify(draft)).catch(
        (err: unknown) => {
          console.warn('[wizard] Auto-save failed:', err);
        },
      );
    }, AUTO_SAVE_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [
    category,
    photoUrls,
    title,
    description,
    urgency,
    desiredOutcome,
    communityImpact,
    address,
    latitude,
    longitude,
    district,
    authorities,
    lastCompletedStep,
  ]);

  const value = useMemo<WizardContextValue>(
    () => ({
      category,
      setCategory,
      photoUrls,
      addPhotoUrl,
      removePhotoUrl,
      title,
      setTitle,
      description,
      setDescription,
      urgency,
      setUrgency,
      desiredOutcome,
      setDesiredOutcome,
      communityImpact,
      setCommunityImpact,
      address,
      setAddress,
      latitude,
      longitude,
      district,
      setLocation,
      authorities,
      setAuthorities,
      lastCompletedStep,
      setLastCompletedStep,
      restoreFromDraft,
      reset,
    }),
    [
      category,
      setCategory,
      photoUrls,
      addPhotoUrl,
      removePhotoUrl,
      title,
      setTitle,
      description,
      setDescription,
      urgency,
      setUrgency,
      desiredOutcome,
      setDesiredOutcome,
      communityImpact,
      setCommunityImpact,
      address,
      setAddress,
      latitude,
      longitude,
      district,
      setLocation,
      authorities,
      setAuthorities,
      lastCompletedStep,
      setLastCompletedStep,
      restoreFromDraft,
      reset,
    ],
  );

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}

export function useWizard(): WizardContextValue {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error('useWizard must be used within a WizardProvider');
  }
  return context;
}

export { MAX_PHOTOS };
