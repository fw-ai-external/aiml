import { CacheError, Entry, Store } from '@unkey/cache';
import { Err, Ok, type Result } from '@unkey/error';

export type CloudflareCacheConfig<TNamespaces extends Record<string, () => KVNamespace>> = {
  /**
   * The Cloudflare KV namespace to use for caching, e.g. env.YOUR_KV_NAMESPACE
   */
  kvNamespaces: TNamespaces;

  defaultFreshDurationMs: number;
  defaultStaleDurationMs: number;
};

export class CloudflareKVStore<TNamespaces extends Record<string, () => KVNamespace>, TValue>
  implements Store<Extract<keyof TNamespaces, string>, TValue>
{
  private readonly kvNamespaces: TNamespaces;
  private readonly defaultFreshDurationMs: number;
  private readonly defaultStaleDurationMs: number;
  public readonly name = 'cloudflare-kv';

  constructor(config: CloudflareCacheConfig<TNamespaces>) {
    this.kvNamespaces = config.kvNamespaces;
    this.defaultFreshDurationMs = config.defaultFreshDurationMs;
    this.defaultStaleDurationMs = config.defaultStaleDurationMs;
  }

  public async get(
    namespace: Extract<keyof TNamespaces, string>,
    key: string,
  ): Promise<Result<Entry<TValue> | undefined, CacheError>> {
    let value: string | null;
    if (!this.kvNamespaces[namespace]) {
      return Err(
        new CacheError({
          tier: this.name,
          key,
          message: `Namespace ${namespace} not found`,
        }),
      );
    }

    try {
      value = await this.kvNamespaces[namespace]().get(key);
    } catch (err) {
      return Err(
        new CacheError({
          tier: this.name,
          key,
          message: (err as Error).message,
        }),
      );
    }

    if (!value) {
      return Ok(undefined);
    }
    return Ok<Entry<TValue>>({
      value: value as TValue,
      freshUntil: Date.now() + this.defaultFreshDurationMs,
      staleUntil: Date.now() + this.defaultStaleDurationMs,
    });
  }

  public async set(
    namespace: Extract<keyof TNamespaces, string>,
    key: string,
    entry: Entry<TValue>,
  ): Promise<Result<void, CacheError>> {
    if (!this.kvNamespaces[namespace]) {
      return Err(
        new CacheError({
          tier: this.name,
          key,
          message: `Namespace ${namespace} not found`,
        }),
      );
    }
    try {
      await this.kvNamespaces[namespace]().put(key, entry.value as string);
    } catch (err) {
      return Err(
        new CacheError({
          tier: this.name,
          key,
          message: (err as Error).message,
        }),
      );
    }
    return Ok();
  }

  public async remove(namespace: Extract<keyof TNamespaces, string>, key: string): Promise<Result<void, CacheError>> {
    if (!this.kvNamespaces[namespace]) {
      return Err(
        new CacheError({
          tier: this.name,
          key,
          message: `Namespace ${namespace} not found`,
        }),
      );
    }
    try {
      await this.kvNamespaces[namespace]().delete(key);
    } catch (err) {
      return Err(
        new CacheError({
          tier: this.name,
          key,
          message: (err as Error).message,
        }),
      );
    }
    return Ok();
  }
}
