export const API_BASE = "https://izitopop.com/api";

export const TOKEN_KEY = "izitopop_token";
export const USER_KEY = "izitopop_user";

export type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setSession(token: string, user: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user ?? null));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export function getStoredUser<T = AuthUser>(): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

type RequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  auth?: boolean;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = false } = options;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    const init: RequestInit = { method, headers };
    if (body !== undefined) init.body = JSON.stringify(body);
    res = await fetch(`${API_BASE}${path}`, init);
  } catch {
    throw new ApiError("Connexion impossible. Vérifie ton réseau.", 0);
  }

  if (res.status === 401 && auth) {
    clearSession();
  }

  let json: ApiEnvelope<T> | null = null;
  try {
    json = (await res.json()) as ApiEnvelope<T>;
  } catch {
    json = null;
  }

  if (!res.ok || !json || json.success === false) {
    throw new ApiError(json?.message || `Erreur ${res.status}`, res.status);
  }

  return (json.data ?? ({} as T)) as T;
}

/* ---------------- Types ---------------- */

export type AuthUser = {
  id?: number | string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  referral_code?: string;
  points?: number;
  wallet_balance?: number | string;
  [key: string]: unknown;
};

export type Package = {
  id: number | string;
  name?: string;
  label?: string;
  amount?: string | number;
  price_usd?: string | number;
  price_htg?: string | number;
  bonus?: string | null;
  [key: string]: unknown;
};

export type Product = {
  id: number | string;
  name?: string;
  slug?: string;
  category?: string;
  description?: string;
  image?: string;
  image_url?: string;
  packages?: Package[];
  [key: string]: unknown;
};

export type Order = {
  id?: number | string;
  order_id?: number | string;
  order_number?: string;
  status?: string;
  payment_status?: string;
  delivery_status?: string;
  delivered_code?: string | null;
  payment_method?: string;
  price_usd?: string | number;
  price_htg?: string | number;
  product_name?: string;
  package_name?: string;
  created_at?: string;
  [key: string]: unknown;
};

export type WalletTransaction = {
  id?: number | string;
  type?: string;
  amount?: string | number;
  description?: string;
  created_at?: string;
  [key: string]: unknown;
};

export type ReferralStats = {
  referral_code?: string;
  referral_link?: string;
  points?: number;
  wallet_balance?: number | string;
  referrals?: Array<Record<string, unknown>>;
  points_history?: Array<Record<string, unknown>>;
};

export type Wallet = {
  balance?: number | string;
  points?: number;
  transactions?: WalletTransaction[];
};

export type PaymentMethod = "moncash" | "natcash" | "card" | "wallet";

/* ---------------- Endpoints ---------------- */

export const api = {
  auth: {
    register: (body: {
      first_name: string;
      last_name: string;
      email: string;
      phone: string;
      password: string;
      referral_code?: string;
    }) =>
      apiRequest<{ token: string; user: AuthUser }>("/auth/index.php?action=register", {
        method: "POST",
        body,
      }),
    login: (body: { email: string; password: string }) =>
      apiRequest<{ token: string; user: AuthUser }>("/auth/index.php?action=login", {
        method: "POST",
        body,
      }),
    logout: () => apiRequest<unknown>("/auth/index.php?action=logout", { auth: true }),
    me: () => apiRequest<AuthUser>("/auth/index.php?action=me", { auth: true }),
    forgotPassword: (body: { email: string }) =>
      apiRequest<unknown>("/auth/index.php?action=forgot-password", { method: "POST", body }),
    resetPassword: (body: { token: string; password: string }) =>
      apiRequest<unknown>("/auth/index.php?action=reset-password", { method: "POST", body }),
  },
  products: {
    list: () => apiRequest<Product[] | { products: Product[] }>("/products/index.php?action=list"),
    detail: (slug: string) =>
      apiRequest<Product | { product: Product }>(
        `/products/index.php?action=detail&slug=${encodeURIComponent(slug)}`,
      ),
  },
  orders: {
    create: (body: { package_id: number | string; payment_method: PaymentMethod }) =>
      apiRequest<Order>("/orders/index.php?action=create", { method: "POST", body, auth: true }),
    list: () =>
      apiRequest<Order[] | { orders: Order[] }>("/orders/index.php?action=list", { auth: true }),
    detail: (id: string | number) =>
      apiRequest<Order | { order: Order }>(`/orders/index.php?action=detail&id=${id}`, {
        auth: true,
      }),
  },
  payments: {
    initiate: (body: { order_id: string | number }) =>
      apiRequest<{ redirect_url?: string; client_secret?: string }>(
        "/payments/index.php?action=initiate",
        { method: "POST", body, auth: true },
      ),
    verify: (orderId: string | number) =>
      apiRequest<{ payment_status?: string; delivery_status?: string }>(
        `/payments/index.php?action=verify&order_id=${orderId}`,
        { auth: true },
      ),
  },
  referrals: {
    profile: () => apiRequest<AuthUser>("/referrals/index.php?action=profile", { auth: true }),
    stats: () => apiRequest<ReferralStats>("/referrals/index.php?action=stats", { auth: true }),
    wallet: () => apiRequest<Wallet>("/referrals/index.php?action=wallet", { auth: true }),
    updateProfile: (body: { first_name: string; last_name: string; phone: string }) =>
      apiRequest<AuthUser>("/referrals/index.php?action=update-profile", {
        method: "POST",
        body,
        auth: true,
      }),
    redeemPoints: (body: { points: number }) =>
      apiRequest<unknown>("/referrals/index.php?action=redeem-points", {
        method: "POST",
        body,
        auth: true,
      }),
    validateCoupon: (code: string, productId: number | string) =>
      apiRequest<{ discount?: number | string; valid?: boolean; [k: string]: unknown }>(
        `/referrals/index.php?action=validate-coupon&code=${encodeURIComponent(String(code))}&product_id=${productId}`,
        { auth: true },
      ),
  },
};

/* ---------------- Helpers ---------------- */

export function unwrapList<T>(data: unknown, key: string): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj[key])) return obj[key] as T[];
    for (const value of Object.values(obj)) {
      if (Array.isArray(value)) return value as T[];
    }
  }
  return [];
}

export function unwrapItem<T>(data: unknown, key: string): T | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  if (obj[key] && typeof obj[key] === "object") return obj[key] as T;
  return obj as T;
}
