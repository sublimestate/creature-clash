import { describe, expect, it, beforeEach, vi } from 'vitest';
import { usePlayerStore } from '../playerStore';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    mergeItem: vi.fn(),
    clear: vi.fn(),
    getAllKeys: vi.fn(),
    flushGetRequests: vi.fn(),
    multiGet: vi.fn(),
    multiSet: vi.fn(),
    multiRemove: vi.fn(),
    multiMerge: vi.fn(),
  },
}));

describe('playerStore', () => {
  beforeEach(() => {
    usePlayerStore.getState().resetAll();
  });

  it('addCreature automatically assigns a new creature to an empty team slot', () => {
    const store = usePlayerStore.getState();
    
    // Default team has 5 empty slots
    expect(store.team.every(t => t.instanceId === null)).toBe(true);

    const owned = store.addCreature('tabby', 1);

    const updatedStore = usePlayerStore.getState();
    expect(updatedStore.ownedCreatures).toContainEqual(owned);
    
    // It should be slotted into the first empty slot (slot 1)
    const slot1 = updatedStore.team.find(t => t.slot === 1);
    expect(slot1?.instanceId).toBe(owned.instanceId);
  });

  it('addCreature does not assign to team if no slots are empty', () => {
    let store = usePlayerStore.getState();
    
    // Fill all 5 slots
    store.addCreature('tabby');
    store.addCreature('pup');
    store.addCreature('yapper');
    store.addCreature('pugling');
    store.addCreature('sphynx');

    store = usePlayerStore.getState();
    expect(store.team.every(t => t.instanceId !== null)).toBe(true);

    // Add a 6th creature
    const c6 = store.addCreature('mutt');

    store = usePlayerStore.getState();
    expect(store.ownedCreatures).toContainEqual(c6);

    // Ensure c6 is not in the team
    const inTeam = store.team.some(t => t.instanceId === c6.instanceId);
    expect(inTeam).toBe(false);
  });
});
