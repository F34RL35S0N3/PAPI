// ============================================================
// PasarPintar AI - TypeScript Type Definitions
// ============================================================

export interface Product {
  id: number;
  name: string;
  category: "batik" | "kerajinan" | "pangan";
  unit: string;
  description: string;
  latest_price: number | null;
}

export interface PriceHistory {
  id: number;
  product_id: number;
  product_name: string;
  category: string;
  unit: string;
  price: number;
  source: string;
  recorded_at: string;
}

export interface PriceSummary {
  product_id: number;
  product_name: string;
  category: string;
  unit: string;
  current_price: number;
  previous_price: number;
  change_percentage: number;
  trend: "naik" | "turun" | "stabil";
  min_price: number;
  max_price: number;
  avg_price: number;
  ma_7: number;
  ma_14: number;
}

export interface Recommendation {
  product_id: number;
  product_name: string;
  category: string;
  unit: string;
  action: "jual_sekarang" | "tahan" | "beli_stok";
  confidence: number;
  reason: string;
  current_price: number;
  change_percentage: number;
  trend: string;
  price_position: number;
  ma_7: number;
  ma_14: number;
}

export interface ChatMessage {
  id?: number;
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  products?: LocalProduct[];
}

export interface ChatResponse {
  response: string;
  session_id: string;
  products?: LocalProduct[];
}

export interface PriceAlert {
  id: number;
  product_id: number;
  product_name: string;
  category: string;
  alert_type: "naik" | "turun";
  percentage_change: number;
  message: string;
  is_read: number;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface DescriptionResponse {
  description: string;
  product_name: string;
}

export interface ChartDataPoint {
  week: string;
  [productName: string]: number | string;
}

// Fitur 1: AI Matchmaker
export interface LocalShop {
  id: number;
  name: string;
  whatsapp: string;
  address: string;
  district: string;
  distance_km: number;
}

export interface LocalProduct {
  id: number;
  name: string;
  category: string;
  price: number;
  shop: LocalShop;
}

// Fitur 2: Smart Routing
export interface RoutePoint {
  name: string;
  lat: number;
  lng: number;
}

export interface OptimizeResponse {
  optimized_order: string[];
  total_distance_km: number;
  estimated_savings: number;
  points: RoutePoint[];
}
