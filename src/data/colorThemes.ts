export const COLOR_THEMES = [
  { id: 'forest', label: 'themeForest' },
  { id: 'electric', label: 'themeElectric' },
  { id: 'ruby', label: 'themeRuby' },
  { id: 'amber', label: 'themeAmber' },
  { id: 'violet', label: 'themeViolet' },
  { id: 'coral', label: 'themeCoral' },
  { id: 'ocean', label: 'themeOcean' },
  { id: 'mint', label: 'themeMint' },
  { id: 'slate', label: 'themeGraphite' },
  { id: 'orange', label: 'themeEmber' },
] as const;

export type ColorThemeId = (typeof COLOR_THEMES)[number]['id'];

export const DEFAULT_COLOR_THEME: ColorThemeId = 'forest';

export const isColorThemeId = (value: string): value is ColorThemeId =>
  COLOR_THEMES.some((theme) => theme.id === value);
