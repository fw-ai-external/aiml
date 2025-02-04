export async function fetchWithRetries(
  url: string,
  options: RequestInit = {},
  timeout: number = 5000,
  retries: number = 3,
): Promise<any> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  const fetchWithTimeout = () => fetch(url, { ...options, signal: controller.signal });

  try {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetchWithTimeout();
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        clearTimeout(id);
        return await response.json();
      } catch (error) {
        if (i === retries - 1) throw error;
      }
    }
  } finally {
    clearTimeout(id);
  }
}
