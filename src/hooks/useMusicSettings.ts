import { useEffect, useState } from 'react';
import { getMusicSettings, setMusicMuted, setMusicVolume, subscribeMusicSettings } from '../lib/music';

export function useMusicSettings() {
  const [settings, setSettings] = useState(getMusicSettings());

  useEffect(() => subscribeMusicSettings(() => setSettings(getMusicSettings())), []);

  return {
    volume: settings.volume,
    muted: settings.muted,
    setVolume: setMusicVolume,
    setMuted: setMusicMuted,
  };
}
