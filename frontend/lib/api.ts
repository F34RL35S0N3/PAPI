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
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

// ---- Chat ----
export async function sendChatMessage(
  message: string,
  sessionId: string = "default"
): Promise<ChatResponse> {
  return fetchAPI<ChatResponse>("/api/chat/send", {
    method: "POST",
    body: JSON.stringify({ message, session_id: sessionId }),
  });
}

export async function getChatHistory(
  sessionId: string = "default",
  limit: number = 20
) {
  return fetchAPI<
    { id: number; user_message: string; ai_response: string; created_at: string }[]
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
  if (params?.product_id) searchParams.set("product_id", String(params.product_id));
  if (params?.category) searchParams.set("category", params.category);
  if (params?.weeks) searchParams.set("weeks", String(params.weeks));
  if (params?.source) searchParams.set("source", params.source);

  const query = searchParams.toString();
  return fetchAPI<PriceHistory[]>(`/api/prices/history${query ? `?${query}` : ""}`);
}

export async function getPriceSummary(
  category?: string
): Promise<PriceSummary[]> {
  const params = category ? `?category=${category}` : "";
  return fetchAPI<PriceSummary[]>(`/api/prices/summary${params}`);
}

export async function getCategories(): Promise<Category[]> {
  return fetchAPI<Category[]>("/api/prices/categories");
}

// ---- Recommendations ----
export async function getRecommendations(
  category?: string
): Promise<Recommendation[]> {
  const params = category ? `?category=${category}` : "";
  return fetchAPI<Recommendation[]>(`/api/recommendations/${params}`);
}

// ---- Descriptions ----
export async function generateDescription(
  productName: string,
  category: string = "",
  additionalInfo: string = ""
): Promise<DescriptionResponse> {
  return fetchAPI<DescriptionResponse>("/api/descriptions/generate", {
    method: "POST",
    body: JSON.stringify({
      product_name: productName,
      category,
      additional_info: additionalInfo,
    }),
  });
}

// ---- Alerts ----
export async function getAlerts(
  unreadOnly: boolean = false
): Promise<PriceAlert[]> {
  return fetchAPI<PriceAlert[]>(
    `/api/alerts/?unread_only=${unreadOnly}`
  );
}

export async function getAlertCount(): Promise<{ unread_count: number }> {
  return fetchAPI<{ unread_count: number }>("/api/alerts/count");
}

export async function markAlertRead(alertId: number): Promise<void> {
  await fetchAPI(`/api/alerts/${alertId}/read`, { method: "PUT" });
}

// ---- Routing ----
import type { OptimizeResponse } from "./types";

export async function optimizeRoute(destinations: string[]): Promise<OptimizeResponse> {
  return fetchAPI<OptimizeResponse>("/api/routes/optimize", {
    method: "POST",
    body: JSON.stringify({ destinations }),
  });
}
