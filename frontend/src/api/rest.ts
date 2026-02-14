export async function apiCall<T = unknown>(
  path: string,
  token: string,
  options?: RequestInit,
  baseUrl?: string
): Promise<T> {
  const resolvedBaseUrl = baseUrl || import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}${window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? ':3002' : ''}`;
  const method = options?.method?.toUpperCase();
  const hasBody = options?.body != null;
  const shouldSetJsonContentType =
    hasBody && (method === 'POST' || method === 'PUT' || method === 'PATCH');
  const res = await fetch(`${resolvedBaseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(shouldSetJsonContentType ? { 'Content-Type': 'application/json' } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}
