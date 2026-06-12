/** WCAG contrast level targets. */
export type ContrastLevel = 'aa-normal' | 'aa-large' | 'aa-ui';

/** Which color role to nudge when fixing contrast. */
export type ColorRole = 'foreground' | 'background';

export type Rgb = { r: number; g: number; b: number };

export type ParsedColor = {
  hex: string;
  rgb: Rgb;
};

export type TailwindScaleStep = {
  family: string;
  step: number;
  hex: string;
};

export type TailwindScaleAdjustment = {
  family: string;
  fromStep: number;
  toStep: number;
  direction: 'lighter' | 'darker';
  steps: number;
};

export type ContrastMeasurement = {
  ratio: number;
  passes: boolean;
  targetRatio: number;
  level: ContrastLevel;
  lighter: ColorRole;
  darker: ColorRole;
};

export type ContrastSuggestion = ContrastMeasurement & {
  adjustRole: ColorRole;
  currentHex: string;
  suggestedHex: string;
  tailwind: TailwindScaleAdjustment | null;
  message: string;
};

export type MeasureContrastParams = {
  foreground: string;
  background: string;
  level?: ContrastLevel;
};

export type SuggestContrastParams = MeasureContrastParams & {
  /** Which color to move; `auto` picks foreground for text, background for large UI fills. */
  preferAdjust?: ColorRole | 'auto';
};
