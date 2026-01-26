import AsyncStorage from '@react-native-async-storage/async-storage';

import type { FoodLookupResult } from '@/src/lib/foodLookup';
import { normalizeUserInputForCompare } from '@/src/lib/decomposeFood';

type Species = 'dog' | 'cat';

type CacheEnvelope = {
  value: FoodLookupResult;
  createdAt: number;
  expiresAt: number;
};

const KEY_PREFIX = 'result:v2:';
const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function makeKey(normalizedInput: string, species: Species): string {
  const normalized = normalizeUserInputForCompare(normalizedInput);
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

    const value = obj.value as FoodLookupResult;
    if (typeof value !== 'object' || value === null) return null;

    return {
      value,
      createdAt: obj.createdAt,
      expiresAt: obj.expiresAt,
    };
  } catch {
    return null;
  }
}

export async function getCachedResult(
  normalizedInput: string,
  species: Species,
): Promise<FoodLookupResult | null> {
  try {
    const key = makeKey(normalizedInput, species);
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;

    const env = parseEnvelope(raw);
    if (!env) {
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

export async function setCachedResult(
  normalizedInput: string,
  species: Species,
  value: FoodLookupResult,
): Promise<void> {
  try {
    const key = makeKey(normalizedInput, species);
    const createdAt = Date.now();
    const expiresAt = createdAt + DEFAULT_TTL_MS;

    const env: CacheEnvelope = { value, createdAt, expiresAt };
    await AsyncStorage.setItem(key, JSON.stringify(env));
  } catch {
    // never throw
  }
}

