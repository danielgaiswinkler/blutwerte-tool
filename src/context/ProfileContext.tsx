import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Profile } from '../utils/bloodwork-utils';
import {
  initProfiles,
  saveProfiles,
  getActiveProfileId,
  setActiveProfileId as persistActiveProfileId,
  loadEntries,
  saveEntries,
  generateId,
} from '../utils/bloodwork-utils';

interface ProfileContextValue {
  profiles: Profile[];
  activeProfile: Profile | null;
  setActiveProfile: (id: string) => void;
  addProfile: (name: string, defaultGender: 'male' | 'female') => Profile;
  updateProfile: (id: string, updates: Partial<Omit<Profile, 'id'>>) => void;
  deleteProfile: (id: string) => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileIdState] = useState<string | null>(null);

  // Initialize on mount
  useEffect(() => {
    const initialized = initProfiles();
    setProfiles(initialized);
    setActiveProfileIdState(getActiveProfileId());
  }, []);

  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0] ?? null;

  const setActiveProfile = useCallback((id: string) => {
    setActiveProfileIdState(id);
    persistActiveProfileId(id);
  }, []);

  const addProfile = useCallback(
    (name: string, defaultGender: 'male' | 'female'): Profile => {
      const newProfile: Profile = {
        id: `profil-${generateId()}`,
        name,
        defaultGender,
      };
      const updated = [...profiles, newProfile];
      setProfiles(updated);
      saveProfiles(updated);
      return newProfile;
    },
    [profiles],
  );

  const updateProfile = useCallback(
    (id: string, updates: Partial<Omit<Profile, 'id'>>) => {
      const updated = profiles.map((p) => (p.id === id ? { ...p, ...updates } : p));
      setProfiles(updated);
      saveProfiles(updated);
    },
    [profiles],
  );

  const deleteProfile = useCallback(
    (id: string) => {
      if (profiles.length <= 1) return; // Keep at least one profile
      const updated = profiles.filter((p) => p.id !== id);
      setProfiles(updated);
      saveProfiles(updated);

      // Delete entries for this profile
      const entries = loadEntries();
      const filteredEntries = entries.filter((e) => e.profileId !== id);
      saveEntries(filteredEntries);

      // Switch active profile if needed
      if (activeProfileId === id) {
        const newActiveId = updated[0].id;
        setActiveProfileIdState(newActiveId);
        persistActiveProfileId(newActiveId);
      }
    },
    [profiles, activeProfileId],
  );

  return (
    <ProfileContext.Provider
      value={{
        profiles,
        activeProfile,
        setActiveProfile,
        addProfile,
        updateProfile,
        deleteProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
