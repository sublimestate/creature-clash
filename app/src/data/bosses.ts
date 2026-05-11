// Boss persona data, keyed by stage id. Only attached to chapter-finale
// stages — regular stages stay clean and quick.
//
// `taunt`: shown on the preview screen above the team comparison.
// `victoryLine`: shown on the victory banner after defeating this boss.
//
// Keep lines short — 1–2 sentences max. The boss has a quick voice; the
// game speaks louder than the boss.

export interface BossPersona {
  // Display name (the actual cat/dog they're piloting is in stage.enemies[0]).
  name: string;
  // Self-introduction shown before the fight.
  taunt: string;
  // Said after the player wins. Tone shifts from cocky → grudging respect.
  victoryLine: string;
  // Which slot in stage.enemies is "the boss" (defaults to 0).
  // Used for the portrait on the preview screen.
  portraitSlot?: number;
}

export const BOSSES: Record<string, BossPersona> = {
  c1s5: {
    name: 'Mr. Whiskers',
    taunt:
      "Mr. Whiskers blinks at you. \"This is my yard, friend. The hose, the bushes, the warm rock at three. All mine.\"",
    victoryLine:
      "Mr. Whiskers grooms a paw, refusing eye contact. \"Fine. Take the rock. I never liked it anyway.\"",
    portraitSlot: 0,
  },
  c2s5: {
    name: 'King Bramble',
    taunt:
      "King Bramble lifts his head from the dumpster. His eyes are very tired. \"You came to the alley looking for a fight. You'll get one.\"",
    victoryLine:
      "King Bramble lowers himself, slow and deliberate. \"You walk back through the picket fences clean. Tell them the strays let you through. Once.\"",
    portraitSlot: 0,
  },
  c3s5: {
    name: 'The Night Court',
    taunt:
      "The owl tilts her head, slow as moonrise. \"Loud. Brave. Small. The park does not belong to the loud, the brave, or the small.\"",
    victoryLine:
      "The owl flares her wings once, then settles. \"Take the trees, then. We'll keep the dark.\"",
    portraitSlot: 0,
  },
};

export function getBoss(stageId: string): BossPersona | null {
  return BOSSES[stageId] ?? null;
}
