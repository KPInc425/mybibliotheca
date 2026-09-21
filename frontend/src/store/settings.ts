import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserSettings {
  // UI preferences
  useHeroIcons: boolean;

  theme: 'light' | 'dark' | 'auto';
  compactMode: boolean;
  
  // Scanner preferences
  autoFetchBookData: boolean;
  scannerDebugMode: boolean;
  
  // Privacy preferences
  shareCurrentReading: boolean;
  shareReadingActivity: boolean;
  showInPublicLibrary: boolean;
  
  // Notification preferences
  emailNotifications: boolean;
  readingReminders: boolean;
}

interface SettingsState {
  settings: UserSettings;
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
  resetSettings: () => void;
}

const defaultSettings: UserSettings = {
  // Real icons by default. Emoji-as-interface-chrome was the shipped default and
  // is the single clearest sign an app is unfinished; emoji remains available as
  // an explicit choice for anyone who wants it.
  useHeroIcons: true,
  theme: 'auto',
  compactMode: false,
  autoFetchBookData: true,
  scannerDebugMode: false,
  shareCurrentReading: true,
  shareReadingActivity: true,
  showInPublicLibrary: true,
  emailNotifications: false,
  readingReminders: false,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      
      updateSetting: (key, value) => {
        set((state) => ({
          settings: {
            ...state.settings,
            [key]: value,
          },
        }));
      },
      
      resetSettings: () => {
        set({ settings: defaultSettings });
      },
    }),
    {
      name: 'bookoracle-settings',
      partialize: (state) => ({ settings: state.settings }),
    }
  )
);
