const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api";

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;
  shortfall?: number;
  walletBalance?: string;

  constructor(
    message: string,
    status: number,
    errors?: Record<string, string[]>,
    extra?: { shortfall?: number; walletBalance?: string }
  ) {
    super(message);
    this.status = status;
    this.errors = errors;
    this.shortfall = extra?.shortfall;
    this.walletBalance = extra?.walletBalance;
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("ath_token");
}

export function getStoredToken(): string | null {
  return getToken();
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem("ath_token", token);
  else window.localStorage.removeItem("ath_token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const isFormData = options.body instanceof FormData;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        // Don't set Content-Type for FormData — the browser needs to add
        // its own multipart boundary, which it can only do if we leave
        // this header out entirely.
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
    });
  } catch {
    // fetch() itself threw — almost always means the API is unreachable
    // (backend not running, wrong NEXT_PUBLIC_API_URL) or the request was
    // blocked by CORS. Surface something actionable instead of a generic
    // "Something went wrong".
    throw new ApiError(
      `Could not reach the API at ${API_URL}. Is the Laravel server running, and is CORS configured for this origin?`,
      0
    );
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(data.message ?? "Request failed", res.status, data.errors, {
      shortfall: data.shortfall,
      walletBalance: data.wallet_balance,
    });
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  postForm: <T>(path: string, formData: FormData) =>
    request<T>(path, { method: "POST", body: formData }),
  /**
   * Downloads a file from an authenticated endpoint. A plain <a href> link
   * can't send the Authorization header, so this fetches the file as a
   * blob (with the header attached, same as every other request) and
   * triggers the save via a temporary object URL instead.
   */
  download: async (path: string, filename: string): Promise<void> => {
    const token = getToken();
    const res = await fetch(`${API_URL}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new ApiError(data.message ?? "Could not download file", res.status);
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};
