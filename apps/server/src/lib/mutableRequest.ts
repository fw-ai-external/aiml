import { HonoRequest } from 'hono';
import { getNormalizedURLPath } from '~/utils/url';

/**
 * A mutable version of the Request object.
 * This is useful for modifying the request before it is sent to the API.
 * The middleware will augment this at various stages as-needed before proxying through to the backend
 */
export class MutableRequest {
  private _body: ReadableStream<any> | null = null;
  private _cachedBody: Blob | null = null;
  private _cachedBodyStream: ReadableStream<any> | null = null;

  constructor(request: HonoRequest) {
    this.method = request.method.toUpperCase();
    this.url = request.url;
    this.originalUrl = request.url;
    this.headers = new Headers(request.header());
    this.redirect = request.raw.redirect;
    this.fetcher = request.raw.fetcher;
    this.signal = request.raw.signal;
    this.cf = request.raw.cf;
    this.integrity = request.raw.integrity;
    this.keepalive = request.raw.keepalive;

    let cachedBodyReader: ReadableStreamDefaultController<any> | null = null;
    this._cachedBodyStream = new ReadableStream({
      start: (controller) => {
        cachedBodyReader = controller;
      },
    });

    this._body = new ReadableStream({
      start: async (controller) => {
        // Wait for the cached body reader to be available
        while (cachedBodyReader === null) {
          await new Promise((resolve) => setTimeout(resolve, 1));
        }

        if (request.raw.body) {
          const reader = request.raw.body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            cachedBodyReader?.enqueue(value);
            controller.enqueue(value);
          }
        }
        controller.close();
        cachedBodyReader?.close();
      },
    });
  }

  method: string;
  readonly originalUrl: string;
  private _url: string;
  /** Returns the URL of request as a string. */
  get url() {
    return this._url;
  }
  set url(url: string) {
    this._url = getNormalizedURLPath(url, {
      apiBaseUrl: this._basePath,
    });
  }
  _basePath: string;
  set basePath(basePath: string) {
    // workers call through the secure tunnel directly, so we use HTTP to avoid SSL handshake latency of 100ms per request on avg
    // for dev though, we use HTTPS to keep keys secure on public internet
    if (
      basePath.includes('tunnel.fireworks.ai') &&
      process.env.ENVIRONMENT !== 'development' &&
      process.env.ENVIRONMENT !== 'test'
    ) {
      this._basePath = `http://${basePath.replace(/^(http:\/\/|https:\/\/)/, '')}`;
    } else {
      this._basePath = `https://${basePath.replace(/^(http:\/\/|https:\/\/)/, '')}`;
    }

    this._url = getNormalizedURLPath(this._url, {
      apiBaseUrl: this._basePath,
    });
  }

  getBody = async () => {
    if (this.method === 'GET' || this.method === 'HEAD') {
      return undefined;
    }

    if (this._cachedBody) {
      return this._cachedBody;
    }
    if (this._cachedBodyStream === null) {
      return null;
    }

    while (this._cachedBodyStream === undefined) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    // now that we have waited, we need to re-check if the stream is locked
    // to account for async calls to getBody
    if (this._cachedBodyStream.locked) {
      // if so, wait till its finished
      while (!this._cachedBody) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      return this._cachedBody;
    }
    this._cachedBody = await new Response(this._cachedBodyStream).blob();
    return this._cachedBody;
  };

  /**
   * Override the request body.
   */
  async setBody(body: string) {
    this._cachedBody = await new Response(body).blob();
  }

  /** Returns a Headers object consisting of the headers associated with request. Note that headers added in the network layer by the user agent will not be accounted for in this object, e.g., the "Host" header. */
  headers: Headers;
  /** Returns the redirect mode associated with request, which is a string indicating how redirects for the request will be handled during fetching. A request will follow redirects by default. */
  redirect: string;
  fetcher: Fetcher | null;
  /** Returns the signal associated with request, which is an AbortSignal object indicating whether or not request has been aborted, and its abort event handler. */
  signal: AbortSignal;
  cf?: any;
  /** Returns request's subresource integrity metadata, which is a cryptographic hash of the resource being fetched. Its value consists of multiple hashes separated by whitespace. [SRI] */
  integrity: string;
  /** Returns a boolean indicating whether or not request can outlive the global in which it was created. */
  keepalive: boolean;

  toRequest(customBaseUrl?: string): Request {
    if (
      customBaseUrl?.includes('tunnel.fireworks.ai') &&
      process.env.ENVIRONMENT !== 'development' &&
      process.env.ENVIRONMENT !== 'test'
    ) {
      customBaseUrl = `http://${customBaseUrl.replace(/^(http:\/\/|https:\/\/)/, '')}`;
    } else if (customBaseUrl) {
      customBaseUrl = `https://${customBaseUrl.replace(/^(http:\/\/|https:\/\/)/, '')}`;
    }

    return new Request(
      getNormalizedURLPath(this.url, {
        apiBaseUrl: customBaseUrl ?? this._basePath,
      }),
      {
        method: this.method,
        headers: this.headers,
        redirect: this.redirect,
        fetcher: this.fetcher,
        signal: this.signal,
        body: this.method === 'GET' || this.method === 'HEAD' ? undefined : this._body,
        cf: this.cf,
        integrity: this.integrity,
      },
    );
  }
}
