export async function apiCall<T = unknown>(
  path: string,
  token: string,
  options?: RequestInit
): Promise<T> {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3002';
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json() as Promise<T>;
}
