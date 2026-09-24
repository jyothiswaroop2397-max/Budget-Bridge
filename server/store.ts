import fs from 'fs';
import path from 'path';
import { Redis } from '@upstash/redis';

const STATE_REDIS_KEY = process.env.STATE_REDIS_KEY || 'budget_bridge:state';

/**
 * Lazy-initialized Upstash Redis client instance.
 * Automatically connects if Vercel KV or Upstash Redis environment variables are present.
 */
let redisClient: Redis | null = null;
let redisInitAttempted = false;

function getRedisClient(): Redis | null {
  if (redisInitAttempted) return redisClient;
  redisInitAttempted = true;

  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    try {
      redisClient = new Redis({
        url: url.trim(),
        token: token.trim(),
      });
      console.log('[store] Upstash Redis / Vercel KV persistence enabled.');
    } catch (err) {
      console.warn('[store] Failed to initialize Upstash Redis client:', err);
      redisClient = null;
    }
  }
  return redisClient;
}

/**
 * Resolves the writable directory where local application state is stored.
 * On serverless environments (Vercel/AWS Lambda), falls back to /tmp if root is read-only.
 */
function getWritableDataDir(): string {
  const dataDirEnv = process.env.DATA_DIR;
  if (dataDirEnv) {
    return path.resolve(process.cwd(), dataDirEnv);
  }

  const primaryDir = path.resolve(process.cwd(), 'data');
  try {
    if (!fs.existsSync(primaryDir)) {
      fs.mkdirSync(primaryDir, { recursive: true });
    }
    // Test write permission
    fs.accessSync(primaryDir, fs.constants.W_OK);
    return primaryDir;
  } catch {
    // Ephemeral serverless container fallback
    const tmpDir = path.join('/tmp', 'budget_bridge_data');
    try {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
    } catch {
      // Ignore
    }
    return tmpDir;
  }
}

/**
 * Returns the path to the state JSON file.
 */
function getStateFilePath(): string {
  return path.join(getWritableDataDir(), 'state.json');
}

/**
 * Sanitizes legacy user profile names and default avatars.
 */
function sanitizeStateProfile(parsed: any): any {
  if (parsed && typeof parsed === 'object' && parsed.userProfile) {
    const p = parsed.userProfile;
    if (!p.name || p.name === 'Maverick Vinales' || p.name === 'Guest Account') {
      p.name = 'Guest';
    }
    if (
      !p.avatarUrl ||
      typeof p.avatarUrl !== 'string' ||
      p.avatarUrl.includes('MV') ||
      p.avatarUrl.includes('%4D%56') ||
      p.avatarUrl.includes('avatarGrad')
    ) {
      const guestSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120"><defs><linearGradient id="guestGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#10B981" /><stop offset="100%" stop-color="#047857" /></linearGradient></defs><rect width="120" height="120" rx="60" fill="url(#guestGrad)" /><circle cx="60" cy="46" r="20" fill="#FFFFFF" opacity="0.95" /><path d="M26 98 C26 78, 41 68, 60 68 C79 68, 94 78, 94 98 Z" fill="#FFFFFF" opacity="0.95" /></svg>`;
      p.avatarUrl = 'data:image/svg+xml;utf8,' + encodeURIComponent(guestSvg);
    }
  }
  return parsed;
}

/**
 * Reads state from disk file synchronously.
 */
export function loadStateSync(): unknown | null {
  const filePath = getStateFilePath();
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(rawData);
    return sanitizeStateProfile(parsed);
  } catch (err) {
    console.error(`[store] Failed to read state from ${filePath}:`, err);
    return null;
  }
}

/**
 * Writes state to disk file synchronously using atomic rename.
 */
export function saveStateSync(state: unknown): void {
  const dataDir = getWritableDataDir();
  const filePath = path.join(dataDir, 'state.json');

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const tempPath = path.join(
    dataDir,
    `state.tmp.${Date.now()}.${Math.random().toString(36).slice(2)}.json`
  );

  try {
    const jsonString = JSON.stringify(state, null, 2);
    fs.writeFileSync(tempPath, jsonString, 'utf-8');
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    } catch {
      // Ignore cleanup error
    }
    throw err;
  }
}

/**
 * Asynchronously loads application state.
 * Tries Upstash Redis / Vercel KV first, then falls back to local disk or /tmp.
 */
export async function loadState(): Promise<unknown | null> {
  const redis = getRedisClient();
  if (redis) {
    try {
      const data = await redis.get(STATE_REDIS_KEY);
      if (data !== null && data !== undefined) {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        return sanitizeStateProfile(parsed);
      }
    } catch (err) {
      console.warn('[store] Redis fetch failed, falling back to disk:', err);
    }
  }

  // Fallback to local disk / ephemeral /tmp
  return loadStateSync();
}

/**
 * Asynchronously saves application state.
 * Saves to Upstash Redis / Vercel KV if configured, and also attempts local disk / /tmp.
 */
export async function saveState(state: unknown): Promise<{ success: boolean; storage: string }> {
  let storageMode = 'none';

  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.set(STATE_REDIS_KEY, typeof state === 'string' ? state : JSON.stringify(state));
      storageMode = 'redis';
    } catch (err) {
      console.warn('[store] Redis write failed:', err);
    }
  }

  try {
    saveStateSync(state);
    if (storageMode === 'none') {
      storageMode = 'disk';
    }
  } catch (err) {
    if (storageMode === 'none') {
      console.warn('[store] Disk write failed (serverless read-only), client localStorage will preserve state:', err);
      storageMode = 'client-fallback';
    }
  }

  return { success: true, storage: storageMode };
}
