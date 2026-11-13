const TOKEN_KEY = 'moventra_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string, remember: boolean) {
  if (remember) {
    localStorage.setItem(TOKEN_KEY, token);
    sessionStorage.removeItem(TOKEN_KEY);
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

export async function apiFetch<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export function formatINR(amount: number): string {
  return `₹${Math.round(amount || 0).toLocaleString('en-IN')}`;
}

export function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Geodesic distance fallback ONLY used when Google Maps Routes API is unavailable or quota-exceeded.
 * Clearly flagged in UI as an estimated highway distance.
 */
export function estimateRoadDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): { distanceKm: number; durationText: string } {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightKm = R * c;
  // Indian intercity highway winding factor ~1.22x
  const roadKm = Math.max(5, Math.round(straightKm * 1.22));
  const totalMins = Math.round((roadKm / 56) * 60);
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  const durationText = hrs > 0 ? `${hrs} hrs ${mins} mins` : `${mins} mins`;
  return { distanceKm: roadKm, durationText };
}
