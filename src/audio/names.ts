export const AUDIO = {
  INTRO: 'loop4',
  PLAY: 'loop',
  HIT: 'loop3',
  LEVEL: 'level',
} as const;

export type AudioName = typeof AUDIO[keyof typeof AUDIO];
