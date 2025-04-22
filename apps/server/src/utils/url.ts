/**
 * Take a URL with potentially extra slashes, or trailing slashes and remove them as they can break CF fetch calls
 * e.g. https://api.fireworks.ai/v1//completions/ -> https://api.fireworks.ai/v1/completions
 *
 * @param url
 */
export function getNormalizedURLPath(url: string, options?: { apiBaseUrl?: string }): string {
  const reqUrl = new URL(url);

  reqUrl.pathname = reqUrl.pathname.replace(/\/+$/, '');
  return `${options?.apiBaseUrl || reqUrl.origin}${reqUrl.pathname}${reqUrl.search}`;
}
