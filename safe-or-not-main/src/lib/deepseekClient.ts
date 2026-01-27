export type DeepSeekRole = 'system' | 'user' | 'assistant';

export type DeepSeekMessage = {
  role: DeepSeekRole;
  content: string;
};

type CallDeepSeekOptions = {
  /**
   * Request timeout in milliseconds.
   * Defaults to 12s for a calm, snappy MVP experience.
   */
  timeoutMs?: number;
  /**
   * Model to use. Defaults to DeepSeek chat model.
   */
  model?: string;
};

const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_MODEL = 'tngtech/deepseek-r1t2-chimera:free';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAbortError(err: unknown): boolean {
  return (
    err !== null &&
    typeof err === 'object' &&
    'name' in err &&
    (err as { name?: string }).name === 'AbortError'
  );
}

function getApiKey(): string {
  const key = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
  if (!key) {
    throw new Error('Missing EXPO_PUBLIC_OPENROUTER_API_KEY');
  }
  return key;
}

async function postWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

function shouldRetry(err: unknown, res?: Response): boolean {
  // Retry once on transient server errors.
  if (res) return res.status >= 500 || res.status === 429;

  // Retry only on abort timeout errors.
  return isAbortError(err);
}

async function readErrorBody(res: Response): Promise<string> {
  try {
    const text = await res.text();
    return text ? ` Response body: ${text}` : '';
  } catch {
    return '';
  }
}

/**
 * Calls OpenRouter Chat Completions API and returns the assistant's raw text.
 *
 * - Uses https://openrouter.ai/api/v1/chat/completions
 * - Reads API key from EXPO_PUBLIC_OPENROUTER_API_KEY
 * - Uses a free DeepSeek model by default
 * - Adds a timeout
 * - Retries once on transient failure
 */
export async function callDeepSeek(
  messages: DeepSeekMessage[],
  options: CallDeepSeekOptions = {},
): Promise<string> {
  const apiKey = getApiKey();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const model = options.model ?? DEFAULT_MODEL;

  const url = 'https://openrouter.ai/api/v1/chat/completions';

  const body = JSON.stringify({
    model,
    messages,
    // Keep output as plain content; no streaming in this minimal client.
    stream: false,
  });

  const init: RequestInit = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body,
  };

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const startTime = Date.now();
    const isRetry = attempt > 0;

    try {
      const res = await postWithTimeout(url, init, timeoutMs);
      const durationMs = Date.now() - startTime;

      if (!res.ok) {
        if (attempt === 0 && shouldRetry(undefined, res)) {
          if (__DEV__) {
            console.log(
              `OPENROUTER_CALL duration_ms=${durationMs} model=${model} retry=${isRetry} status=${res.status}`,
            );
          }
          continue;
        }
        const extra = await readErrorBody(res);
        if (__DEV__) {
          console.log(
            `OPENROUTER_CALL duration_ms=${durationMs} model=${model} retry=${isRetry} status=${res.status} failed`,
          );
        }
        throw new Error(`OpenRouter request failed: ${res.status} ${res.statusText}.${extra}`);
      }

      const data = (await res.json()) as unknown;
      const text =
        typeof data === 'object' &&
        data !== null &&
        'choices' in data &&
        Array.isArray((data as any).choices) &&
        (data as any).choices[0] &&
        (data as any).choices[0].message &&
        typeof (data as any).choices[0].message.content === 'string'
          ? ((data as any).choices[0].message.content as string)
          : null;

      if (__DEV__) {
        console.log(`OPENROUTER_CALL duration_ms=${durationMs} model=${model} retry=${isRetry} success`);
      }

      if (text === null) {
        // Return as much as possible for debugging while still being "raw text".
        return JSON.stringify(data);
      }

      return text;
    } catch (err) {
      const durationMs = Date.now() - startTime;
      lastError = err;

      if (attempt === 0 && shouldRetry(err)) {
        if (__DEV__) {
          console.log(
            `OPENROUTER_CALL duration_ms=${durationMs} model=${model} retry=${isRetry} error=abort_timeout`,
          );
        }
        // Add 400ms delay before retry
        await sleep(400);
        continue;
      }

      if (__DEV__) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.log(
          `OPENROUTER_CALL duration_ms=${durationMs} model=${model} retry=${isRetry} error="${errorMsg}"`,
        );
      }
      throw err;
    }
  }

  // Should be unreachable, but keeps TS happy.
  throw lastError instanceof Error ? lastError : new Error('OpenRouter request failed');
}

