// 5 commons offered to a new player. Picks 2.
//
// Wild role intentionally absent — first earned-creature should bring
// something the starter pack doesn't, giving early stages real weight.

export const STARTER_CANDIDATE_IDS = [
  'tabby',    // Predator — neighborhood hunter
  'pup',      // Social   — pack-builder
  'yapper',   // Swift    — small terrier, fast
  'pugling',  // Tough    — stocky, stubborn
  'sphynx',   // Cunning  — bald, weird, smart
] as const;

export const STARTER_PICK_COUNT = 2;
