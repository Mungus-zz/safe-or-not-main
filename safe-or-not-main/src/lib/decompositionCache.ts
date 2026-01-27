import AsyncStorage from '@react-native-async-storage/async-storage';

import type { DecompositionResponse } from '@/src/lib/decomposeFood';
import { normalizeUserInputForCompare } from '@/src/lib/decomposeFood';

type Species = 'dog' | 'cat';

type CacheEnvelope = {
  value: DecompositionResponse;
  createdAt: number;
  expiresAt: number;
};

const KEY_PREFIX = 'decomp:v3:';
const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function makeKey(normalizedName: string, species: Species): string {
  const normalized = normalizeUserInputForCompare(normalizedName);
  return `${KEY_PREFIX}${normalized}:${species}`;
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

function parseEnvelope(raw: string): CacheEnvelope | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
    const obj = parsed as Record<string, unknown>;

    if (!('value' in obj) || !('createdAt' in obj) || !('expiresAt' in obj)) return null;
    if (!isFiniteNumber(obj.createdAt) || !isFiniteNumber(obj.expiresAt)) return null;

    // Value shape: we treat it as DecompositionResponse (already validated elsewhere).
    const value = obj.value as DecompositionResponse;
    if (typeof value !== 'object' || value === null) return null;
    if ((value as any).version !== '1') return null;

    return {
      value,
      createdAt: obj.createdAt,
      expiresAt: obj.expiresAt,
    };
  } catch {
    return null;
  }
}

export async function getCachedDecomposition(
  normalizedName: string,
  species: Species,
): Promise<DecompositionResponse | null> {
  try {
    const key = makeKey(normalizedName, species);
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;

    const env = parseEnvelope(raw);
    if (!env) {
      // Corrupt/unknown shape — remove and fail closed.
      await AsyncStorage.removeItem(key);
      return null;
    }

    const now = Date.now();
    if (env.expiresAt <= now) {
      await AsyncStorage.removeItem(key);
      return null;
    }

    return env.value;
  } catch {
    return null;
  }
}

export async function setCachedDecomposition(
  normalizedName: string,
  species: Species,
  value: DecompositionResponse,
): Promise<void> {
  try {
    const key = makeKey(normalizedName, species);
    const createdAt = Date.now();
    const expiresAt = createdAt + DEFAULT_TTL_MS;

    const env: CacheEnvelope = { value, createdAt, expiresAt };
    await AsyncStorage.setItem(key, JSON.stringify(env));
  } catch {
    // Never throw
  }
}

export async function clearExpiredDecompositions(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const decompKeys = keys.filter((k) => k.startsWith(KEY_PREFIX));
    if (decompKeys.length === 0) return;

    // Best-effort + minimal: check in chunks to avoid large memory spikes.
    const chunkSize = 50;
    const now = Date.now();

    for (let i = 0; i < decompKeys.length; i += chunkSize) {
      const chunk = decompKeys.slice(i, i + chunkSize);
      const pairs = await AsyncStorage.multiGet(chunk);

      const toRemove: string[] = [];
      for (const [key, raw] of pairs) {
        if (!raw) continue;
        const env = parseEnvelope(raw);
        if (!env || env.expiresAt <= now) {
          toRemove.push(key);
        }
      }

      if (toRemove.length > 0) {
        await AsyncStorage.multiRemove(toRemove);
      }
    }
  } catch {
    // best effort, never throw
  }
}

