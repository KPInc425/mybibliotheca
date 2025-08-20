import React from 'react';
import { useSettingsStore } from '@/store/settings';

interface IconProps {
  hero?: React.ReactNode;
  emoji?: string;
  className?: string;
}

const Icon: React.FC<IconProps> = ({ hero, emoji, className }) => {
  const { settings } = useSettingsStore();
  if (settings.useHeroIcons && hero) {
    return <span className={className}>{hero}</span>;
  }
  return <span className={className}>{emoji || ''}</span>;
};

export default Icon;


