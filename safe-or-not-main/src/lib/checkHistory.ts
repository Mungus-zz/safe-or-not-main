import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ProvenanceType } from '@/src/lib/foodLookup';

export type CheckHistoryEntry = {
  normalizedInput: string;
  canonicalName: string;
  verdict: 'SAFE' | 'TOXIC' | 'VET FIRST';
  provenance: ProvenanceType;
  timestamp: number;
};

const HISTORY_KEY = 'checkHistory:v1';
const MAX_ENTRIES = 10;

function parseEntries(raw: string): CheckHistoryEntry[] | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const out: CheckHistoryEntry[] = [];
    for (const item of parsed) {
      if (
        typeof item === 'object' &&
        item !== null &&
        typeof (item as CheckHistoryEntry).normalizedInput === 'string' &&
        typeof (item as CheckHistoryEntry).canonicalName === 'string' &&
        typeof (item as CheckHistoryEntry).verdict === 'string' &&
        typeof (item as CheckHistoryEntry).provenance === 'string' &&
        typeof (item as CheckHistoryEntry).timestamp === 'number'
      ) {
        out.push(item as CheckHistoryEntry);
      }
    }
    return out;
  } catch {
    return null;
  }
}

/**
 * Returns the last 10 check entries (newest first).
 */
export async function getCheckHistory(): Promise<CheckHistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const entries = parseEntries(raw);
    if (!entries) return [];
    // Store is oldest-first; return newest-first for display.
    return [...entries].reverse();
  } catch {
    return [];
  }
}

/**
 * Appends one successful check and keeps only the last MAX_ENTRIES.
 */
export async function addCheckEntry(entry: CheckHistoryEntry): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    let entries: CheckHistoryEntry[] = raw ? parseEntries(raw) ?? [] : [];
    entries.push(entry);
    if (entries.length > MAX_ENTRIES) {
      entries = entries.slice(-MAX_ENTRIES);
    }
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch {
    // never throw
  }
}

/**
 * Clears all history entries.
 */
export async function clearCheckHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch {
    // never throw
  }
}
