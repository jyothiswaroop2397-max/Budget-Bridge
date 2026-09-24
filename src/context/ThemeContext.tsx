import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeConfig, ThemeId, THEMES, DEFAULT_THEME_ID, getStoredTheme, saveStoredTheme } from '../utils/theme.js';

interface ThemeContextType {
  themeId: ThemeId;
  theme: ThemeConfig;
  setThemeId: (id: ThemeId) => void;
  availableThemes: ThemeConfig[];
}

const ThemeContext = createContext<ThemeContextType>({
  themeId: DEFAULT_THEME_ID,
  theme: THEMES[DEFAULT_THEME_ID],
  setThemeId: () => {},
  availableThemes: Object.values(THEMES),
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeId, setThemeIdState] = useState<ThemeId>(() => getStoredTheme());

  const setThemeId = (id: ThemeId) => {
    if (THEMES[id]) {
      setThemeIdState(id);
      saveStoredTheme(id);
    }
  };

  const theme = THEMES[themeId] || THEMES[DEFAULT_THEME_ID];

  useEffect(() => {
    // Sync root HTML & body styles for clean edge-to-edge backdrop
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--color-theme-bg', theme.bgRoot);
      document.documentElement.style.setProperty('--color-theme-card', theme.bgCard);
      document.documentElement.style.setProperty('--color-theme-accent', theme.accentColor);
      document.body.style.backgroundColor = theme.bgRoot;
      document.body.style.color = theme.textPrimary;
      
      if (theme.isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [theme]);

  return (
    <ThemeContext.Provider
      value={{
        themeId,
        theme,
        setThemeId,
        availableThemes: Object.values(THEMES),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => useContext(ThemeContext);
