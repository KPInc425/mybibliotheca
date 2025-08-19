import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserSettings {
  // Icon preferences
  useHeroIcons: boolean;
  
  // UI preferences
  theme: 'light' | 'dark' | 'auto';
  compactMode: boolean;
  
  // Scanner preferences
  autoFetchBookData: boolean;
  scannerDebugMode: boolean;
  
  // Privacy preferences
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
  useHeroIcons: false, // Default to emoji icons
  theme: 'auto',
  compactMode: false,
  autoFetchBookData: true,
  scannerDebugMode: false,
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
