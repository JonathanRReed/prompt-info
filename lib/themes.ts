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

export type ThemeMode = 'dark' | 'light';

export type ThemeName = 'night' | 'redline' | 'amber' | 'ledger' | 'blueprint' | 'clay';

export type ThemeDefinition = {
  name: string;
  tone: string;
  mode: ThemeMode;
  colors: ThemeColors;
};

export const themes: Record<ThemeName, ThemeDefinition> = {
  night: {
    name: 'Carbon CRT',
    tone: 'Dark, red, high contrast',
    mode: 'dark',
    colors: {
      base: '#0a0a0a',
      surface: '#101010',
      overlay: '#181818',
      muted: '#777777',
      subtle: '#b7b7b7',
      text: '#eaeaea',
      love: '#e61919',
      gold: '#d7d7d7',
      rose: '#cfcfcf',
      pine: '#777777',
      foam: '#eaeaea',
      iris: '#e61919',
      highlightLow: '#141414',
      highlightMed: '#2a2a2a',
      highlightHigh: '#4a4a4a',
    },
  },
  redline: {
    name: 'Redline Dark',
    tone: 'Dark, graphite, signal red',
    mode: 'dark',
    colors: {
      base: '#101010',
      surface: '#151515',
      overlay: '#1f1f1f',
      muted: '#858585',
      subtle: '#c4c4c4',
      text: '#f2f2f2',
      love: '#ff2a2a',
      gold: '#dddddd',
      rose: '#d5d5d5',
      pine: '#8a8a8a',
      foam: '#f2f2f2',
      iris: '#ff2a2a',
      highlightLow: '#191919',
      highlightMed: '#333333',
      highlightHigh: '#5a5a5a',
    },
  },
  amber: {
    name: 'Amber Terminal',
    tone: 'Dark, brass, terminal amber',
    mode: 'dark',
    colors: {
      base: '#11100b',
      surface: '#19160e',
      overlay: '#242012',
      muted: '#8c8064',
      subtle: '#c9b88d',
      text: '#f6edd3',
      love: '#f4a62a',
      gold: '#ffd17a',
      rose: '#e8c48f',
      pine: '#9a8b65',
      foam: '#f6edd3',
      iris: '#f4a62a',
      highlightLow: '#1c180f',
      highlightMed: '#3a321f',
      highlightHigh: '#6c5a32',
    },
  },
  ledger: {
    name: 'Ledger Paper',
    tone: 'Light, warm paper, red ink',
    mode: 'light',
    colors: {
      base: '#f4efe4',
      surface: '#fffaf0',
      overlay: '#ece2d1',
      muted: '#766e62',
      subtle: '#514a41',
      text: '#191713',
      love: '#b71916',
      gold: '#795a26',
      rose: '#7d453c',
      pine: '#5b6652',
      foam: '#2f4f4b',
      iris: '#8b3a20',
      highlightLow: '#e8dfcf',
      highlightMed: '#cfc1ad',
      highlightHigh: '#9e8f79',
    },
  },
  blueprint: {
    name: 'Blueprint Light',
    tone: 'Light, technical, blue ink',
    mode: 'light',
    colors: {
      base: '#e9eef1',
      surface: '#f8fbfc',
      overlay: '#dbe5ea',
      muted: '#62717a',
      subtle: '#34454f',
      text: '#101a20',
      love: '#1f6feb',
      gold: '#955f14',
      rose: '#865b54',
      pine: '#32596a',
      foam: '#174d61',
      iris: '#1f6feb',
      highlightLow: '#d7e0e6',
      highlightMed: '#b6c6cf',
      highlightHigh: '#708690',
    },
  },
  clay: {
    name: 'Clay Desk',
    tone: 'Light, clay, olive accent',
    mode: 'light',
    colors: {
      base: '#eee1d0',
      surface: '#f8eedf',
      overlay: '#e0cdb8',
      muted: '#746457',
      subtle: '#4c4037',
      text: '#1d1712',
      love: '#6d7f32',
      gold: '#8a5b22',
      rose: '#8c5248',
      pine: '#59652f',
      foam: '#315f55',
      iris: '#6d7f32',
      highlightLow: '#deccb8',
      highlightMed: '#bda78f',
      highlightHigh: '#7d6b58',
    },
  },
};

export function applyTheme(theme: ThemeName) {
  const definition = themes[theme] ?? themes.night;
  const colors = definition.colors;
  const root = document.documentElement;

  Object.entries(colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-rose-${key}`, value);
  });
  root.setAttribute('data-theme', definition.mode);
  root.setAttribute('data-theme-name', theme);
}
