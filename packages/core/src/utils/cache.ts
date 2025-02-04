"use server";
import { generateObject, generateText } from "ai";
import zodToJsonSchema from "zod-to-json-schema";

export async function getCacheForPrompt(
  callSettings:
    | Parameters<typeof generateObject>[0]
    | Parameters<typeof generateText>[0]
): Promise<string | undefined> {
  const cacheKey = await createCacheKey(callSettings);

  let res: Response;
  try {
    // @ts-expect-error I don't know why this is not working
    res = await caches.default.match(new Request(cacheKey));
  } catch (err) {
    return undefined;
  }
  if (!res) {
    return undefined;
  }
  const encodedValue = await res.text();

  if (encodedValue) {
    return Buffer.from(encodedValue, "base64").toString("utf-8");
  }
  return undefined;
}

async function createCacheKey<
  P extends
    | Parameters<typeof generateObject>[0]
    | Parameters<typeof generateText>[0],
>(callSettings: P): Promise<URL> {
  // Remove mode.config from args before stringifying
  const callSettingsForHash = {
    ...callSettings,
    model: { ...callSettings.model, config: {} as any } as any,
  } as P;

  if ("schema" in callSettingsForHash) {
    callSettingsForHash.schema = zodToJsonSchema(
      callSettingsForHash.schema as any
    ) as any;
  }
  if ("tools" in callSettingsForHash && callSettingsForHash.tools) {
    callSettingsForHash.tools = Object.keys(callSettingsForHash.tools).reduce(
      (acc, name) => ({
        ...acc,
        [name]: {
          description: (callSettingsForHash.tools?.[name] as any).description,
          parameters: zodToJsonSchema(
            callSettingsForHash.tools?.[name]?.parameters ?? {}
          ),
          execute: callSettingsForHash.tools?.[name]?.execute?.toString(),
        },
      }),
      {}
    );
  }

  const hashInput = JSON.stringify(callSettingsForHash);

  // Create a SHA-256 hash
  const encoder = new TextEncoder();
  const data = encoder.encode(hashInput);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const fullHash = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Convert the first 24 bits (6 hex characters) to an integer
  const int24bit = parseInt(fullHash.slice(0, 6), 16);

  // Convert to base-36 and ensure it's exactly 6 characters
  return new URL(
    `https://fetchcache.com/cache/${int24bit
      .toString(36)
      .padStart(6, "0")
      .slice(0, 6)}`
  );
}

export async function setCacheForPrompt(
  callSettings:
    | Parameters<typeof generateObject>[0]
    | Parameters<typeof generateText>[0],
  value:
    | Awaited<ReturnType<typeof generateObject>>
    | Awaited<ReturnType<typeof generateText>>
): Promise<void> {
  const cacheKey = await createCacheKey(callSettings);
  const req = new Request(cacheKey);
  const encodedValue = Buffer.from(JSON.stringify(value)).toString("base64");

  const res = new Response(encodedValue, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": `public, max-age=${60 * 60 * 24 * 7}`,
    },
  });

  if (typeof caches !== "undefined") {
    // @ts-expect-error I don't know why this is not working
    await caches.default.put(req, res);
  }
}
