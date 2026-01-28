import AsyncStorage from '@react-native-async-storage/async-storage';

import { normalizeUserInputForCompare } from '@/src/lib/decomposeFood';

type USDACachePayload = {
  query: string;
  fdcId: number;
  description: string;
  dataType: string;
  brandName?: string;
  ingredientsText?: string;
  cachedAt: number;
};

const KEY_PREFIX = 'usda:v1:';
const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function makeKey(queryNormalized: string): string {
  const normalized = normalizeUserInputForCompare(queryNormalized);
  return `${KEY_PREFIX}${normalized}`;
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

function parsePayload(raw: string): USDACachePayload | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
    const obj = parsed as Record<string, unknown>;

    if (
      !('query' in obj) ||
      !('fdcId' in obj) ||
      !('description' in obj) ||
      !('dataType' in obj) ||
      !('cachedAt' in obj)
    ) {
      return null;
    }

    if (
      typeof obj.query !== 'string' ||
      !isFiniteNumber(obj.fdcId) ||
      typeof obj.description !== 'string' ||
      typeof obj.dataType !== 'string' ||
      !isFiniteNumber(obj.cachedAt)
    ) {
      return null;
    }

    const payload: USDACachePayload = {
      query: obj.query,
      fdcId: obj.fdcId,
      description: obj.description,
      dataType: obj.dataType,
      cachedAt: obj.cachedAt,
    };

    if ('brandName' in obj && typeof obj.brandName === 'string') {
      payload.brandName = obj.brandName;
    }

    if ('ingredientsText' in obj && typeof obj.ingredientsText === 'string') {
      payload.ingredientsText = obj.ingredientsText;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function getUsdaCached(queryNormalized: string): Promise<USDACachePayload | null> {
  try {
    const key = makeKey(queryNormalized);
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      if (__DEV__) console.log('USDA_CACHE:miss');
      return null;
    }

    const payload = parsePayload(raw);
    if (!payload) {
      // Corrupt/unknown shape — remove and fail closed.
      await AsyncStorage.removeItem(key);
      if (__DEV__) console.log('USDA_CACHE:miss reason=corrupt');
      return null;
    }

    const now = Date.now();
    const age = now - payload.cachedAt;
    if (age >= DEFAULT_TTL_MS) {
      await AsyncStorage.removeItem(key);
      if (__DEV__) console.log('USDA_CACHE:miss reason=expired');
      return null;
    }

    if (__DEV__) console.log('USDA_CACHE:hit');
    return payload;
  } catch {
    if (__DEV__) console.log('USDA_CACHE:miss reason=error');
    return null;
  }
}

export async function setUsdaCached(
  queryNormalized: string,
  payload: Omit<USDACachePayload, 'cachedAt'>,
): Promise<void> {
  try {
    const key = makeKey(queryNormalized);
    const cachedAt = Date.now();

    const fullPayload: USDACachePayload = {
      ...payload,
      cachedAt,
    };

    await AsyncStorage.setItem(key, JSON.stringify(fullPayload));
  } catch {
    // never throw
  }
}
