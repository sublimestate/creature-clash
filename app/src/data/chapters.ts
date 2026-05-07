// Story beats shown before the first stage of a chapter.
// Tone progression: Ch.1 = cozy/playful → Ch.2 = first edge of grit.
// Future chapters (rooftops, sewers) can darken further while keeping the
// neighborhood-pet voice.

import { STAGES } from './stages';

export interface ChapterIntro {
  number: number;
  title: string;
  subtitle: string;
  // 3–5 short lines, revealed one at a time.
  lines: string[];
  // Accent color used by the intro screen (sky / horizon mood).
  accent: string;
}

export const CHAPTERS: Record<number, ChapterIntro> = {
  1: {
    number: 1,
    title: 'The Backyard',
    subtitle: 'Chapter One',
    lines: [
      'Summer in the neighborhood. Sprinklers hiss.',
      'Pups dig holes. Cats nap on warm flagstones.',
      "But the lawn won't claim itself.",
      'A new pack rises. The block stirs.',
    ],
    accent: '#FFD93D', // warm gold — afternoon sun
  },
  2: {
    number: 2,
    title: 'The Strays',
    subtitle: 'Chapter Two',
    lines: [
      'The fences end at the alley.',
      'Past the picket lines, no one feeds you.',
      'The strays know the rules: claws first, ask later.',
      'You go anyway. The Stray King is real.',
    ],
    accent: '#FF7849', // dusk orange-red — first hint of edge
  },
};

// First-stage-of-chapter lookup, used to route from the intro back into the
// regular flow.
export function firstStageIdOfChapter(chapter: number): string | null {
  const stage = STAGES.find((s) => s.chapter === chapter && s.index === 1);
  return stage?.id ?? null;
}

export function isFirstStageOfChapter(stageId: string): number | null {
  const stage = STAGES.find((s) => s.id === stageId);
  if (!stage) return null;
  return stage.index === 1 ? stage.chapter : null;
}
