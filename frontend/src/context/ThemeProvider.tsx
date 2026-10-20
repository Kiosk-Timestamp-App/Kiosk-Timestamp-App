import { createContext, useContext } from 'react';

type Theme = 'light' | 'dark';
type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Der TV-Kiosk zeigt laut Design (CLAUDE-DESIGN-KIT, Kiosk-Referenz) immer die Navy-Bühne.
 * Alle Komponenten erhalten deshalb fest `dark`; die Theme-Einstellung im Backend wird nicht mehr abgefragt.
 */
const value: ThemeContextType = { theme: 'dark', toggleTheme: () => {} };

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => (
  <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
);

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
