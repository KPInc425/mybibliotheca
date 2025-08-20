import React, { useEffect } from 'react';
import { useSettingsStore } from '@/store/settings';

interface ThemeProviderProps {
  children: React.ReactNode;
}

const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { settings } = useSettingsStore();

  useEffect(() => {
    const htmlElement = document.documentElement;
    
    // Remove existing theme attributes
    htmlElement.removeAttribute('data-theme');
    
    // Apply theme based on settings
    if (settings.theme === 'auto') {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      htmlElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      htmlElement.setAttribute('data-theme', settings.theme);
    }
  }, [settings.theme]);

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    if (settings.theme !== 'auto') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const htmlElement = document.documentElement;
      const prefersDark = mediaQuery.matches;
      htmlElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [settings.theme]);

  return <>{children}</>;
};

export default ThemeProvider;
