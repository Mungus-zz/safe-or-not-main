const BASE_URL = 'https://api.nal.usda.gov/fdc/v1';
const REQUEST_TIMEOUT_MS = 6_000;

type USDASearchResult = {
  fdcId: number;
  description: string;
  dataType: string;
  brandName?: string;
};

function getApiKey(): string {
  const key = process.env.EXPO_PUBLIC_USDA_API_KEY;
  if (!key) {
    throw new Error('Missing EXPO_PUBLIC_USDA_API_KEY');
  }
  return key;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

function isNetworkError(err: unknown): boolean {
  if (err && typeof err === 'object' && 'name' in err) {
    const name = (err as { name?: string }).name;
    return name === 'AbortError' || name === 'TypeError' || name === 'NetworkError';
  }
  return false;
}

async function makeRequest(
  url: string,
  init: RequestInit,
  type: 'search' | 'details',
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const startTime = Date.now();
    const isRetry = attempt > 0;

    try {
      const res = await fetchWithTimeout(url, init, REQUEST_TIMEOUT_MS);
      const durationMs = Date.now() - startTime;

      if (__DEV__) {
        console.log(
          `USDA_CALL type=${type} duration_ms=${durationMs} status=${res.status} retry=${isRetry}`,
        );
      }

      if (!res.ok) {
        if (attempt === 0 && (res.status >= 500 || res.status === 429)) {
          // Retry on server errors
          await sleep(400);
          continue;
        }
        throw new Error(`USDA API request failed: ${res.status} ${res.statusText}`);
      }

      return res;
    } catch (err) {
      const durationMs = Date.now() - startTime;
      lastError = err;

      if (attempt === 0 && isNetworkError(err)) {
        if (__DEV__) {
          console.log(
            `USDA_CALL type=${type} duration_ms=${durationMs} status=error retry=${isRetry} error=network`,
          );
        }
        await sleep(400);
        continue;
      }

      if (__DEV__) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.log(
          `USDA_CALL type=${type} duration_ms=${durationMs} status=error retry=${isRetry} error="${errorMsg}"`,
        );
      }
      throw err;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('USDA API request failed');
}

/**
 * Searches USDA FoodData Central for foods matching the query.
 * Returns top 5 results with fdcId, description, dataType, and brandName (if present).
 */
export async function usdaSearch(query: string): Promise<USDASearchResult[]> {
  const apiKey = getApiKey();
  const url = `${BASE_URL}/foods/search?api_key=${encodeURIComponent(apiKey)}`;

  const body = JSON.stringify({
    query,
    pageSize: 25,
    pageNumber: 1,
    dataType: ['Branded', 'Foundation', 'SR Legacy', 'Survey (FNDDS)'],
  });

  const init: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
  };

  const res = await makeRequest(url, init, 'search');
  const data = (await res.json()) as unknown;

  if (
    typeof data === 'object' &&
    data !== null &&
    'foods' in data &&
    Array.isArray((data as any).foods)
  ) {
    return ((data as any).foods as any[]).map((food: any) => ({
      fdcId: typeof food.fdcId === 'number' ? food.fdcId : 0,
      description: typeof food.description === 'string' ? food.description : '',
      dataType: typeof food.dataType === 'string' ? food.dataType : '',
      brandName: typeof food.brandName === 'string' ? food.brandName : undefined,
    }));
  }

  return [];
}

/**
 * Gets detailed food information from USDA FoodData Central by FDC ID.
 * Returns the raw JSON response.
 */
export async function usdaFoodDetails(fdcId: number): Promise<unknown> {
  const apiKey = getApiKey();
  const url = `${BASE_URL}/food/${fdcId}?api_key=${encodeURIComponent(apiKey)}`;

  const init: RequestInit = {
    method: 'GET',
  };

  const res = await makeRequest(url, init, 'details');
  return (await res.json()) as unknown;
}
