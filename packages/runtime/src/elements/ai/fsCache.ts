import fs from "fs/promises";
import path from "path";

// Configure cache directory
const CACHE_DIR =
  process.env.AI_CACHE_DIR || path.join(process.cwd(), "e2e", "__fixtures__");
const CACHE_TTL = parseInt(process.env.AI_CACHE_TTL || "3600", 10); // Default: 1 hour in seconds

// Types for middleware
interface LanguageModelV1StreamPart {
  type: string;
  timestamp?: string | Date;
  [key: string]: any;
}

interface LanguageModelV1Middleware {
  wrapGenerate: (args: {
    doGenerate: () => Promise<any>;
    params: any;
  }) => Promise<any>;
  wrapStream: (args: {
    doStream: () => Promise<{
      stream: ReadableStream<any>;
      [key: string]: any;
    }>;
    params: any;
  }) => Promise<{ stream: ReadableStream<any>; [key: string]: any }>;
}

// Simulate a readable stream
function simulateReadableStream({
  chunks,
  initialDelayInMs = 0,
  chunkDelayInMs = 10,
}: {
  chunks: any[];
  initialDelayInMs?: number;
  chunkDelayInMs?: number;
}): ReadableStream<any> {
  return new ReadableStream({
    async start(controller) {
      if (initialDelayInMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, initialDelayInMs));
      }

      for (const chunk of chunks) {
        controller.enqueue(chunk);
        if (chunkDelayInMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, chunkDelayInMs));
        }
      }

      controller.close();
    },
  });
}

// Ensure cache directory exists
async function ensureCacheDir() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch (error) {
    console.error("Failed to create cache directory:", error);
  }
}

// Generate a cache file path from a key
function getCacheFilePath(key: string): string {
  // Create a hash of the key to avoid invalid filename characters
  const hash = require("crypto")
    .createHash("sha256")
    .update(key)
    .digest("hex")
    .substring(0, 32);
  return path.join(CACHE_DIR, `${hash}.json`);
}

// Read cache from filesystem
async function readCache<T>(key: string): Promise<T | null> {
  const filePath = getCacheFilePath(key);
  try {
    const data = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(data);

    // Check if cache has expired
    if (
      parsed.timestamp &&
      (Date.now() - parsed.timestamp) / 1000 > CACHE_TTL
    ) {
      await fs.unlink(filePath).catch(() => {}); // Delete expired cache
      return null;
    }

    return parsed.data as T;
  } catch (error) {
    // File doesn't exist or can't be read
    return null;
  }
}

// Write cache to filesystem
async function writeCache(key: string, data: any): Promise<void> {
  await ensureCacheDir();
  const filePath = getCacheFilePath(key);
  const cacheData = {
    timestamp: Date.now(),
    data,
  };
  try {
    await fs.writeFile(filePath, JSON.stringify(cacheData), "utf-8");
  } catch (error) {
    console.error("Failed to write cache:", error);
  }
}

/**
 * Clear all cache files from the filesystem
 * @returns Number of files deleted
 */
export async function clearCache(): Promise<number> {
  await ensureCacheDir();
  try {
    const files = await fs.readdir(CACHE_DIR);
    let count = 0;

    for (const file of files) {
      if (file.endsWith(".json")) {
        await fs.unlink(path.join(CACHE_DIR, file)).catch((err) => {
          console.error(`Failed to delete cache file ${file}:`, err);
        });
        count++;
      }
    }

    return count;
  } catch (error) {
    console.error("Failed to clear cache:", error);
    return 0;
  }
}

export const fsCacheMiddleware: LanguageModelV1Middleware = {
  wrapGenerate: async ({ doGenerate, params }) => {
    const cacheKey = JSON.stringify(params);

    const cached =
      await readCache<Awaited<ReturnType<typeof doGenerate>>>(cacheKey);

    if (cached !== null) {
      return {
        ...cached,
        response: {
          ...cached.response,
          timestamp: cached?.response?.timestamp
            ? new Date(cached?.response?.timestamp)
            : undefined,
        },
      };
    }

    const result = await doGenerate();

    writeCache(cacheKey, result).catch((err) =>
      console.error("Failed to cache generate result:", err)
    );

    return result;
  },

  wrapStream: async ({ doStream, params }) => {
    const cacheKey = JSON.stringify(params);

    // Check if the result is in the cache
    const cached = await readCache<LanguageModelV1StreamPart[]>(cacheKey);

    // If cached, return a simulated ReadableStream that yields the cached result
    if (cached !== null) {
      // Format the timestamps in the cached response
      const formattedChunks = cached.map((p) => {
        if (p.type === "response-metadata" && p.timestamp) {
          return { ...p, timestamp: new Date(p.timestamp) };
        } else return p;
      });

      return {
        stream: simulateReadableStream({
          initialDelayInMs: 0,
          chunkDelayInMs: 10,
          chunks: formattedChunks,
        }),
        rawCall: { rawPrompt: null, rawSettings: {} },
      };
    }

    // If not cached, proceed with streaming
    const { stream, ...rest } = await doStream();

    const fullResponse: LanguageModelV1StreamPart[] = [];

    const transformStream = new TransformStream<
      LanguageModelV1StreamPart,
      LanguageModelV1StreamPart
    >({
      transform(chunk, controller) {
        fullResponse.push(chunk);
        controller.enqueue(chunk);
      },
      flush() {
        // Store the full response in the cache after streaming is complete
        writeCache(cacheKey, fullResponse).catch((err) =>
          console.error("Failed to cache stream result:", err)
        );
      },
    });

    return {
      stream: stream.pipeThrough(transformStream),
      ...rest,
    };
  },
};
