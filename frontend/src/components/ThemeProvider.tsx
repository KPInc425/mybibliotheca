import React, { useEffect } from 'react';
import { useSettingsStore } from '@/store/settings';

interface ThemeProviderProps {
  children: React.ReactNode;
}

/**
 * daisyUI theme names. Named explicitly rather than the old 'dark'/'light'
 * strings, because index.css loaded `themes: all`, so those resolved to
 * daisyUI's STOCK themes and the app's own palette was never applied.
 */
const DARK_THEME = 'readingroom';
const LIGHT_THEME = 'readingroom-light';

const applyTheme = (theme: 'light' | 'dark' | 'auto') => {
  const wantsDark =
    theme === 'dark' ||
    (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', wantsDark ? DARK_THEME : LIGHT_THEME);
};

const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { settings } = useSettingsStore();

  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  // Follow the system preference while in auto mode.
  useEffect(() => {
    if (settings.theme !== 'auto') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => applyTheme('auto');

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [settings.theme]);

  return <>{children}</>;
};

export default ThemeProvider;
