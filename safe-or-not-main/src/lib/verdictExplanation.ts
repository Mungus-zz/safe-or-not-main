export type VerdictType = 'SAFE' | 'TOXIC' | 'VET FIRST';

export type VerdictExplanation = {
  reasonKey: string;
  text: string;
};

const HAZARD_DISPLAY_NAMES: Record<string, string> = {
  chocolate: 'Chocolate',
  xylitol: 'Xylitol',
  grapes: 'Grapes',
  raisins: 'Raisins',
  alcohol: 'Alcohol',
  macadamia: 'Macadamia nuts',
};

function toHazardArray(value: string[] | string | undefined): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value.filter((x) => typeof x === 'string');
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? (parsed as string[]).filter((x) => typeof x === 'string') : [];
    } catch {
      return [];
    }
  }
  return [];
}

function toIngredientArray(value: string[] | string | undefined): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value.filter((x) => typeof x === 'string');
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? (parsed as string[]).filter((x) => typeof x === 'string') : [];
    } catch {
      return [];
    }
  }
  return [];
}

function formatHazardId(id: string): string {
  const normalized = id.trim().toLowerCase();
  return HAZARD_DISPLAY_NAMES[normalized] ?? id;
}

function getFirstSortedHazardDisplay(hazardIds: string[]): string | null {
  if (hazardIds.length === 0) return null;
  const sorted = [...hazardIds].map((id) => id.trim().toLowerCase()).sort();
  const first = sorted[0];
  return formatHazardId(first);
}

function isProvenanceUnknown(provenance: string | undefined): boolean {
  if (provenance == null) return true;
  const p = provenance.trim().toLowerCase();
  return p === '' || p === 'unknown';
}

/**
 * Returns a deterministic explanation for a verdict, derived only from existing results.
 */
export function getVerdictExplanation(params: {
  verdict: VerdictType;
  provenance?: string;
  matchedHazards?: string[] | string;
  matchedIngredients?: string[] | string;
}): VerdictExplanation {
  const hazards = toHazardArray(params.matchedHazards);
  const ingredients = toIngredientArray(params.matchedIngredients);
  const provenance = params.provenance ?? '';

  switch (params.verdict) {
    case 'TOXIC': {
      const firstHazard = getFirstSortedHazardDisplay(hazards);
      if (firstHazard) {
        return {
          reasonKey: 'toxic_known_hazard',
          text: `Contains ${firstHazard}, which is a known dog toxin.`,
        };
      }
      return {
        reasonKey: 'toxic_generic',
        text: 'A known dog toxin was detected in what we checked.',
      };
    }

    case 'VET FIRST': {
      if (isProvenanceUnknown(provenance)) {
        return {
          reasonKey: 'vetfirst_verification_failed',
          text: 'We could not verify the ingredients reliably, so safety is unclear.',
        };
      }
      if (hazards.length > 0 || ingredients.length > 0) {
        return {
          reasonKey: 'vetfirst_depends',
          text: 'Safety can depend on preparation or amount, so verify the ingredients first.',
        };
      }
      return {
        reasonKey: 'vetfirst_verification_failed',
        text: 'We could not verify the ingredients reliably, so safety is unclear.',
      };
    }

    case 'SAFE':
    default:
      return {
        reasonKey: 'safe_no_known_hazards',
        text: 'No known dog toxins were found in what we checked. Different recipes or portions can change this.',
      };
  }
}
