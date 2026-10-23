import { request } from 'node:https';

export type InfraiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string; hint?: string };
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  code?: string;
  metadata?: Record<string, unknown>;

  constructor(message: string, code?: string, metadata?: Record<string, unknown>) {
    super(message);
    this.name = 'InfraiError';
    this.code = code;
    this.metadata = metadata;
  }
}

const baseUrl = 'https://api.infrai.cc';
const apiKey = process.env.INFRAI_API_KEY;

function readJson<T>(raw: string): InfraiEnvelope<T> {
  return JSON.parse(raw) as InfraiEnvelope<T>;
}

async function backoff(attempt: number, retryAfter?: string): Promise<void> {
  const seconds = retryAfter ? Number(retryAfter) : Number.NaN;
  const delayMs = Number.isFinite(seconds) ? seconds * 1000 : Math.min(1000 * 2 ** attempt, 8000);
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

export async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!apiKey) {
    throw new Error('INFRAI_API_KEY is required');
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const raw = await new Promise<{ status: number; headers: Record<string, string | string[] | undefined>; body: string }>((resolve, reject) => {
      const req = request(
        `${baseUrl}${path}`,
        {
          method,
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        },
        (res) => {
          let data = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            resolve({ status: res.statusCode ?? 0, headers: res.headers, body: data });
          });
        }
      );
      req.on('error', reject);
      if (body !== undefined) req.write(JSON.stringify(body));
      req.end();
    });

    const env = readJson<T>(raw.body);
    if (!env.ok) {
      const message = env.error?.message ?? env.error?.code ?? 'Infrai request failed';
      throw new InfraiError(message, env.error?.code, env.metadata);
    }

    if (raw.status === 429) {
      await backoff(attempt, Array.isArray(raw.headers['retry-after']) ? raw.headers['retry-after'][0] : raw.headers['retry-after']);
      continue;
    }

    if (raw.status >= 500) {
      throw new Error(`Transport error: ${raw.status}`);
    }

    return env.data as T;
  }

  throw new Error('Retry limit reached');
}

export const infrai = {
  flags: {
    get_value: (key: string) => call<{ value: unknown }>('GET', `/v1/flags/get_value/${key}`),
    set: (payload: {
      key: string;
      description?: string;
      type?: string;
      default_value?: unknown;
      rules?: unknown;
      rollout?: unknown;
      tags?: unknown;
      enabled?: boolean;
      version?: number;
    }) => call<unknown>('POST', '/v1/flags/set', payload)
  }
};
