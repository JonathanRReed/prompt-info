export type ThemeColors = {
  base: string;
  surface: string;
  overlay: string;
  muted: string;
  subtle: string;
  text: string;
  love: string;
  gold: string;
  rose: string;
  pine: string;
  foam: string;
  iris: string;
  highlightLow: string;
  highlightMed: string;
  highlightHigh: string;
};

export type ThemeName = 'night' | 'moon' | 'dawn';

export const themes: Record<ThemeName, { name: string; colors: ThemeColors }> = {
  night: {
    name: 'Rosé Pine Night',
    colors: {
      base: '#191724',
      surface: '#1f1d2e',
      overlay: '#26233a',
      muted: '#6e6a86',
      subtle: '#908caa',
      text: '#e0def4',
      love: '#eb6f92',
      gold: '#f6c177',
      rose: '#ebbcba',
      pine: '#31748f',
      foam: '#9ccfd8',
      iris: '#c4a7e7',
      highlightLow: '#21202e',
      highlightMed: '#403d52',
      highlightHigh: '#524f67',
    },
  },
  moon: {
    name: 'Rosé Pine Moon',
    colors: {
      base: '#232136',
      surface: '#2a273f',
      overlay: '#393552',
      muted: '#6e6a86',
      subtle: '#908caa',
      text: '#e0def4',
      love: '#eb6f92',
      gold: '#f6c177',
      rose: '#ea9a97',
      pine: '#3e8fb0',
      foam: '#9ccfd8',
      iris: '#c4a7e7',
      highlightLow: '#2a283e',
      highlightMed: '#44415a',
      highlightHigh: '#56526e',
    },
  },
  dawn: {
    name: 'Rosé Pine Dawn',
    colors: {
      base: '#faf4ed',
      surface: '#fffaf3',
      overlay: '#f2e9e1',
      muted: '#9893a5',
      subtle: '#797593',
      text: '#575279',
      love: '#b4637a',
      gold: '#ea9d34',
      rose: '#d7827e',
      pine: '#286983',
      foam: '#56949f',
      iris: '#907aa9',
      highlightLow: '#f4ede8',
      highlightMed: '#dfdad9',
      highlightHigh: '#cecacd',
    },
  },
};

export function applyTheme(theme: ThemeName) {
  const colors = themes[theme].colors;
  const root = document.documentElement;

  Object.entries(colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-rose-${key}`, value);
  });
}
