import {
  buildSyncableSnapshot,
  SyncableSnapshot,
  usePlayerStore,
} from '../stores/playerStore';
import { useAuthStore } from './authStore';
import { getSupabase } from './supabase';

// Last-write-wins cloud sync.
//
// Invariants:
//   - playerStore.localUpdatedAt is the LWW timestamp for the local copy.
//   - Whenever any syncable field changes locally, we stamp localUpdatedAt =
//     Date.now() and schedule a debounced push.
//   - On sign-in we pull. If cloud.updated_at > local.localUpdatedAt, we
//     replace local with cloud (via applyCloudSnapshot). Otherwise we push.
//   - The schema version on disk is the playerStore persist version. We
//     refuse to apply cloud snapshots from a different version; the user
//     keeps their local state in that case.

const SCHEMA_VERSION = 2; // keep in sync with playerStore persist version
const DEBOUNCE_MS = 2500;

export type SyncStatus =
  | 'disabled'   // env vars not set
  | 'idle'
  | 'pulling'
  | 'pushing'
  | 'error';

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let lastSerialized: string | null = null;
let storeUnsubscribe: (() => void) | null = null;
let authUnsubscribe: (() => void) | null = null;
let currentStatus: SyncStatus = 'disabled';
let lastError: string | null = null;
const statusListeners = new Set<() => void>();

function setStatus(s: SyncStatus, err?: string | null) {
  currentStatus = s;
  lastError = err ?? null;
  for (const fn of statusListeners) fn();
}

export function getSyncStatus(): { status: SyncStatus; error: string | null } {
  return { status: currentStatus, error: lastError };
}

export function subscribeSyncStatus(fn: () => void): () => void {
  statusListeners.add(fn);
  return () => {
    statusListeners.delete(fn);
  };
}

// Wire the sync layer up exactly once at app boot. Safe to call repeatedly.
export function initCloudSync() {
  const supabase = getSupabase();
  if (!supabase) {
    setStatus('disabled');
    return;
  }
  if (storeUnsubscribe) return; // already initialized
  setStatus('idle');

  storeUnsubscribe = usePlayerStore.subscribe((state, prev) => {
    if (!state.hydrated) return;
    const next = buildSyncableSnapshot(state);
    const serialized = stableStringify(next);
    if (serialized === lastSerialized) return;
    lastSerialized = serialized;
    // Don't stamp on the very first hydrated tick (initial baseline).
    if (prev?.hydrated) {
      usePlayerStore.setState({ localUpdatedAt: Date.now() });
      schedulePush();
    }
  });

  authUnsubscribe = useAuthStore.subscribe((state, prev) => {
    if (state.status === 'signed_in' && prev?.status !== 'signed_in') {
      // Fresh login: reconcile cloud with local once playerStore is hydrated,
      // so an in-flight AsyncStorage hydration doesn't clobber the pull.
      reconcileWhenHydrated();
    }
  });
}

function reconcileWhenHydrated() {
  if (usePlayerStore.getState().hydrated) {
    reconcile().catch((e) => setStatus('error', stringifyError(e)));
    return;
  }
  const unsub = usePlayerStore.subscribe((state) => {
    if (state.hydrated) {
      unsub();
      reconcile().catch((e) => setStatus('error', stringifyError(e)));
    }
  });
}

function schedulePush() {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    pushNow().catch((e) => setStatus('error', stringifyError(e)));
  }, DEBOUNCE_MS);
}

export async function pushNow(): Promise<void> {
  const supabase = getSupabase();
  const user = useAuthStore.getState().user;
  if (!supabase || !user) return;
  setStatus('pushing');
  const state = usePlayerStore.getState();
  const snap = buildSyncableSnapshot(state);
  const updatedAt = new Date(state.localUpdatedAt || Date.now()).toISOString();
  const { error } = await supabase
    .from('saves')
    .upsert(
      {
        user_id: user.id,
        data: snap,
        version: SCHEMA_VERSION,
        updated_at: updatedAt,
      },
      { onConflict: 'user_id' },
    );
  if (error) {
    setStatus('error', error.message);
    return;
  }
  setStatus('idle');
}

async function reconcile(): Promise<void> {
  const supabase = getSupabase();
  const user = useAuthStore.getState().user;
  if (!supabase || !user) return;
  setStatus('pulling');
  const { data, error } = await supabase
    .from('saves')
    .select('data, version, updated_at')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) {
    setStatus('error', error.message);
    return;
  }

  const local = usePlayerStore.getState();
  if (!data) {
    // No cloud copy yet — push local as the seed.
    if (local.localUpdatedAt === 0) {
      // Stamp once so the first push has a real timestamp.
      usePlayerStore.setState({ localUpdatedAt: Date.now() });
    }
    await pushNow();
    return;
  }

  if (data.version !== SCHEMA_VERSION) {
    // Refuse to overwrite local with an incompatible schema. Keep local;
    // any future push will overwrite the cloud copy.
    setStatus('error', `Cloud save schema v${data.version} is incompatible with local v${SCHEMA_VERSION}.`);
    return;
  }

  const cloudUpdatedAt = Date.parse(data.updated_at);
  if (Number.isFinite(cloudUpdatedAt) && cloudUpdatedAt > local.localUpdatedAt) {
    // Cloud wins. Pre-update the serialized cache so the resulting setState
    // doesn't trip the store subscriber into stamping a new localUpdatedAt
    // and pushing right back.
    const snap = data.data as SyncableSnapshot;
    lastSerialized = stableStringify(snap);
    local.applyCloudSnapshot(snap, cloudUpdatedAt);
    setStatus('idle');
    return;
  }
  // Local wins (or tie). Push.
  await pushNow();
}

export function teardownCloudSync() {
  storeUnsubscribe?.();
  authUnsubscribe?.();
  storeUnsubscribe = null;
  authUnsubscribe = null;
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
}

// Deterministic JSON.stringify so object key order doesn't cause false
// "change" detections. Tree is shallow; recursion is fine.
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return '[' + value.map(stableStringify).join(',') + ']';
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return (
    '{' +
    keys
      .map(
        (k) =>
          JSON.stringify(k) +
          ':' +
          stableStringify((value as Record<string, unknown>)[k]),
      )
      .join(',') +
    '}'
  );
}

function stringifyError(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}
