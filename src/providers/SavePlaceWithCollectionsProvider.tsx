import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { SaveToCollectionModal } from '../components/SaveToCollectionModal';
import { useAuth } from '../hooks/useAuth';
import { useSavedPlaces } from '../hooks/useSavedPlaces';
import type { SavedPlaceResult } from '../services/savedPlacesService';

export type CollectionModalMode = 'post-save' | 'manage';

export interface PressSaveOptions {
  saveCount?: number;
  onSaveCountChange?: (saveCount: number) => void;
}

export interface SavePlaceWithCollectionsContextValue {
  isSaved: (placeId: string) => boolean;
  isSaving: (placeId: string) => boolean;
  getSaveCount: (placeId: string, fallback?: number) => number;
  pressSave: (placeId: string, options?: PressSaveOptions) => Promise<SavedPlaceResult>;
  openManageCollections: (
    placeId: string,
    options?: { saveCount?: number },
  ) => { success: boolean; requiresAuth?: boolean };
}

const SavePlaceWithCollectionsContext =
  createContext<SavePlaceWithCollectionsContextValue | null>(null);

export function SavePlaceWithCollectionsProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const { isSaved, isToggling, getSaveCount, toggleSave } = useSavedPlaces();

  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<CollectionModalMode>('post-save');
  const [modalPlaceId, setModalPlaceId] = useState<string | null>(null);
  const [modalSaveCount, setModalSaveCount] = useState(0);
  const postSaveModalShownRef = useRef<string | null>(null);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setModalPlaceId(null);
    postSaveModalShownRef.current = null;
  }, []);

  const openModal = useCallback(
    (mode: CollectionModalMode, placeId: string, saveCount: number) => {
      if (mode === 'post-save' && postSaveModalShownRef.current === placeId && modalVisible) {
        return;
      }
      if (mode === 'post-save') {
        postSaveModalShownRef.current = placeId;
      }
      setModalMode(mode);
      setModalPlaceId(placeId);
      setModalSaveCount(saveCount);
      setModalVisible(true);
    },
    [modalVisible],
  );

  const pressSave = useCallback(
    async (placeId: string, options?: PressSaveOptions): Promise<SavedPlaceResult> => {
      if (!user || !profile?.id) {
        return { success: false, requiresAuth: true, error: 'explore.auth.saveShort' };
      }

      if (isToggling(placeId)) {
        return { success: false, error: 'common.pleaseWait' };
      }

      const wasSaved = isSaved(placeId);
      const currentCount = options?.saveCount ?? getSaveCount(placeId, 0);
      const result = await toggleSave(placeId, currentCount);

      if (result.success && typeof result.saveCount === 'number') {
        options?.onSaveCountChange?.(Math.max(0, result.saveCount));
        if (!wasSaved && result.saved !== false) {
          openModal('post-save', placeId, Math.max(0, result.saveCount ?? currentCount + 1));
        }
      }

      return result;
    },
    [getSaveCount, isSaved, isToggling, openModal, profile?.id, toggleSave, user],
  );

  const openManageCollections = useCallback(
    (placeId: string, options?: { saveCount?: number }) => {
      if (!user || !profile?.id) {
        return { success: false, requiresAuth: true };
      }
      const count = options?.saveCount ?? getSaveCount(placeId, 0);
      openModal('manage', placeId, count);
      return { success: true };
    },
    [getSaveCount, openModal, profile?.id, user],
  );

  const value = useMemo<SavePlaceWithCollectionsContextValue>(
    () => ({
      isSaved,
      isSaving: isToggling,
      getSaveCount,
      pressSave,
      openManageCollections,
    }),
    [getSaveCount, isSaved, isToggling, openManageCollections, pressSave],
  );

  return (
    <SavePlaceWithCollectionsContext.Provider value={value}>
      {children}
      <SaveToCollectionModal
        visible={modalVisible}
        mode={modalMode}
        profileId={profile?.id ?? null}
        placeId={modalPlaceId}
        saveCount={modalSaveCount}
        onClose={closeModal}
      />
    </SavePlaceWithCollectionsContext.Provider>
  );
}

export function useSavePlaceWithCollections(): SavePlaceWithCollectionsContextValue {
  const context = useContext(SavePlaceWithCollectionsContext);
  if (!context) {
    throw new Error('useSavePlaceWithCollections must be used within SavePlaceWithCollectionsProvider');
  }
  return context;
}
