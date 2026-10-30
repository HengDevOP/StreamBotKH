const API_BASE = '/api';

export async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('streamneon_auth_token') : null;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // 12-second timeout to prevent fetch from hanging the window forever
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      signal: options.signal || controller.signal
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const err: any = new Error(data.error || `HTTP error ${response.status}`);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data as T;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      const abortErr: any = new Error(`Request timed out or aborted for ${endpoint}`);
      abortErr.name = 'AbortError';
      abortErr.isAbort = true;
      throw abortErr;
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
