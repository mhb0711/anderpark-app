import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'anderpark-color-mode';

export function useColorMode() {
  const [colorMode, setColorMode] = useState<boolean>(() => localStorage.getItem(STORAGE_KEY) !== 'off');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, colorMode ? 'on' : 'off');
  }, [colorMode]);

  const toggleColorMode = useCallback(() => setColorMode((v) => !v), []);

  return { colorMode, toggleColorMode };
}
