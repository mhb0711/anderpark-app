import { useEffect, useState } from 'react';
import { getSoundSettings, setSoundMuted, setSoundVolume, subscribeSoundSettings } from '../lib/sound';

export function useSoundSettings() {
  const [settings, setSettings] = useState(getSoundSettings());

  useEffect(() => subscribeSoundSettings(() => setSettings(getSoundSettings())), []);

  return {
    volume: settings.volume,
    muted: settings.muted,
    setVolume: setSoundVolume,
    setMuted: setSoundMuted,
  };
}
