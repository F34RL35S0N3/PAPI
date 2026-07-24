// ============================================================
// PasarPintar AI - API Client
// ============================================================

import type {
  Product,
  PriceHistory,
  PriceSummary,
  Recommendation,
  ChatResponse,
  PriceAlert,
  Category,
  DescriptionResponse,
  AdminUser,
  CatalogProduct,
} from "./types";

import { getApiUrl } from "./config";

const API_BASE = getApiUrl();

async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = {
    "Content-Type": "application/json",
    "Bypass-Tunnel-Remainder": "true",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options?.headers,
  };

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      headers,
      ...options,
    });
  } catch (err) {
    if (err instanceof Error && (err.name === "TypeError" || err.message === "Failed to fetch")) {
      throw new Error("Gagal terhubung ke server API backend. Pastikan NEXT_PUBLIC_API_URL dikonfigurasi di Vercel.");
    }
    throw err;
  }

  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }

  // Handle empty responses (204 No Content or empty body)
  const contentType = res.headers.get("content-type");
  if (
    res.status === 204 ||
    !contentType ||
    !contentType.includes("application/json")
  ) {
    return undefined as T;
  }

  return res.json();
}

// ---- Chat ----
export async function sendChatMessage(
  message: string,
  sessionId: string = "default",
  visionContext?: string,
): Promise<ChatResponse> {
  return fetchAPI<ChatResponse>("/api/chat/send", {
    method: "POST",
    body: JSON.stringify({
      message,
      session_id: sessionId,
      vision_context: visionContext,
    }),
  });
}

export async function getChatHistory(
  sessionId: string = "default",
  limit: number = 20,
) {
  return fetchAPI<
    {
      id: number;
      user_message: string;
      ai_response: string;
      created_at: string;
    }[]
  >(`/api/chat/history/${sessionId}?limit=${limit}`);
}

export async function getSuggestedQuestions(): Promise<string[]> {
  return fetchAPI<string[]>("/api/chat/suggested-questions");
}

// ---- Prices ----
export async function getProducts(category?: string): Promise<Product[]> {
  const params = category ? `?category=${category}` : "";
  return fetchAPI<Product[]>(`/api/prices/products${params}`);
}

export async function getPriceHistory(params?: {
  product_id?: number;
  category?: string;
  weeks?: number;
  source?: string;
}): Promise<PriceHistory[]> {
  const searchParams = new URLSearchParams();
  if (params?.product_id)
    searchParams.set("product_id", String(params.product_id));
  if (params?.category) searchParams.set("category", params.category);
  if (params?.weeks) searchParams.set("weeks", String(params.weeks));
  if (params?.source) searchParams.set("source", params.source);

  const query = searchParams.toString();
  return fetchAPI<PriceHistory[]>(
    `/api/prices/history${query ? `?${query}` : ""}`,
  );
}

export async function getPriceSummary(
  category?: string,
): Promise<PriceSummary[]> {
  const params = category ? `?category=${category}` : "";
  return fetchAPI<PriceSummary[]>(`/api/prices/summary${params}`);
}

export async function getCategories(): Promise<Category[]> {
  return fetchAPI<Category[]>("/api/prices/categories");
}

// ---- Recommendations ----
export async function getRecommendations(
  category?: string,
): Promise<Recommendation[]> {
  const params = category ? `?category=${category}` : "";
  return fetchAPI<Recommendation[]>(`/api/recommendations/${params}`);
}

// ---- Descriptions ----
export async function generateDescription(
  productName: string,
  category: string = "",
  additionalInfo: string = "",
  image: string | null = null,
): Promise<DescriptionResponse> {
  return fetchAPI<DescriptionResponse>("/api/descriptions/generate", {
    method: "POST",
    body: JSON.stringify({
      product_name: productName,
      category,
      additional_info: additionalInfo,
      image,
    }),
  });
}

// ---- Alerts ----
export async function getAlerts(
  unreadOnly: boolean = false,
): Promise<PriceAlert[]> {
  return fetchAPI<PriceAlert[]>(`/api/alerts/?unread_only=${unreadOnly}`);
}

export async function getAlertCount(): Promise<{ unread_count: number }> {
  return fetchAPI<{ unread_count: number }>("/api/alerts/count");
}

export async function markAlertRead(alertId: number): Promise<void> {
  await fetchAPI(`/api/alerts/${alertId}/read`, { method: "PUT" });
}

// ---- Routing ----
import type { OptimizeResponse } from "./types";

export async function optimizeRoute(
  destinations: string[],
): Promise<OptimizeResponse> {
  return fetchAPI<OptimizeResponse>("/api/routes/optimize", {
    method: "POST",
    body: JSON.stringify({ destinations }),
  });
}

// ---- Marketplace ----
import type { LocalShop, LocalProduct } from "./types";

export async function getMyShop(): Promise<LocalShop | null> {
  return fetchAPI<LocalShop | null>("/api/marketplace/shop");
}

export async function updateMyShop(data: {
  name: string;
  whatsapp: string;
  address: string;
  district: string;
}): Promise<LocalShop> {
  return fetchAPI<LocalShop>("/api/marketplace/shop", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getMyProducts(): Promise<LocalProduct[]> {
  return fetchAPI<LocalProduct[]>("/api/marketplace/products");
}

export async function addMyProduct(data: {
  name: string;
  category: string;
  price: number;
  stock: number;
  description?: string;
  image_url?: string;
}): Promise<LocalProduct> {
  return fetchAPI<LocalProduct>("/api/marketplace/products", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateMyProduct(
  id: number,
  data: {
    name: string;
    category: string;
    price: number;
    stock: number;
    description?: string;
    image_url?: string;
  },
): Promise<LocalProduct> {
  return fetchAPI<LocalProduct>(`/api/marketplace/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteMyProduct(id: number): Promise<void> {
  return fetchAPI(`/api/marketplace/products/${id}`, {
    method: "DELETE",
  });
}

export async function getAllProducts(): Promise<CatalogProduct[]> {
  return fetchAPI<CatalogProduct[]>("/api/marketplace/all-products");
}

// ---- Business Features ----
import type {
  HealthScore,
  PricingAdvice,
  SimulationResult,
  CopilotAction,
} from "./types";

export async function getHealthScore(data: {
  product_name: string;
  category: string;
  location: string;
  capital_price: number;
  selling_price: number;
  stock: number;
  target_margin: number;
  competitor_price: number;
  trend: string;
  promotion_text: string;
}): Promise<HealthScore> {
  return fetchAPI<HealthScore>("/api/business/health-score", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getPricingAdvice(data: {
  capital_price: number;
  target_margin: number;
  competitor_price: number;
  trend: string;
}): Promise<PricingAdvice> {
  return fetchAPI<PricingAdvice>("/api/business/pricing-advisor", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function runSimulation(data: {
  scenario: string;
  percentage: number;
  capital_price: number;
  selling_price: number;
  sales_volume: number;
}): Promise<SimulationResult> {
  return fetchAPI<SimulationResult>("/api/business/simulator", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getCopilotPlan(
  products: {
    name: string;
    capital_price: number;
    selling_price: number;
    target_margin: number;
    trend: string;
  }[],
): Promise<CopilotAction[]> {
  return fetchAPI<CopilotAction[]>("/api/business/copilot", {
    method: "POST",
    body: JSON.stringify({ products }),
  });
}

// ---- Constraint 1: Activity Logging ----
import type {
  ActivityLogEntry,
  ActivityStats,
  ImpactMetrics,
  ActionItem,
} from "./types";

export async function logActivity(data: {
  activity_type: string;
  detail?: string;
  status?: string;
}): Promise<void> {
  await fetchAPI("/api/activity/log", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getActivityLogs(
  limit: number = 30,
): Promise<ActivityLogEntry[]> {
  return fetchAPI<ActivityLogEntry[]>(`/api/activity/logs?limit=${limit}`);
}

export async function getActivityStats(): Promise<ActivityStats> {
  return fetchAPI<ActivityStats>("/api/activity/stats");
}

// ---- Constraint 2: Impact Dashboard ----
export async function getImpactMetrics(
  district?: string,
  category?: string,
): Promise<ImpactMetrics> {
  const params = new URLSearchParams();
  if (district) params.set("district", district);
  if (category) params.set("category", category);
  const query = params.toString();
  return fetchAPI<ImpactMetrics>(
    `/api/impact/metrics${query ? `?${query}` : ""}`,
  );
}

export async function getActionItems(
  district?: string,
  category?: string,
): Promise<ActionItem[]> {
  const params = new URLSearchParams();
  if (district) params.set("district", district);
  if (category) params.set("category", category);
  const query = params.toString();
  return fetchAPI<ActionItem[]>(
    `/api/impact/action-items${query ? `?${query}` : ""}`,
  );
}

// Admin Users API
export async function getAdminUsers(): Promise<AdminUser[]> {
  return fetchAPI<AdminUser[]>("/api/admin/users");
}

export async function updateAdminUser(
  userId: number,
  data: any,
): Promise<{ status: string; message: string }> {
  return fetchAPI<{ status: string; message: string }>(
    `/api/admin/users/${userId}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
  );
}

export async function deleteAdminUser(
  userId: number,
): Promise<{ status: string; message: string }> {
  return fetchAPI<{ status: string; message: string }>(
    `/api/admin/users/${userId}`,
    {
      method: "DELETE",
    },
  );
}
