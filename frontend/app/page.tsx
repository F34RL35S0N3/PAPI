"use client";

import {
  GoogleMap,
  useJsApiLoader,
  DirectionsRenderer,
} from "@react-google-maps/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
  Pie,
  PieChart,
  BarChart,
  Bar,
} from "recharts";
import {
  generateDescription,
  getAlerts,
  getPriceHistory,
  getPriceSummary,
  getRecommendations,
  getSuggestedQuestions,
  sendChatMessage,
  getMyShop,
  updateMyShop,
  getMyProducts,
  addMyProduct,
  updateMyProduct,
  deleteMyProduct,
  getHealthScore,
  getPricingAdvice,
  runSimulation,
  getCopilotPlan,
  logActivity,
  getActivityLogs,
  getActivityStats,
  getImpactMetrics,
  getActionItems,
  getAdminUsers,
  updateAdminUser,
  deleteAdminUser,
  getAllProducts,
} from "@/lib/api";
import { scanBatikImage } from "@/lib/vision";
import type {
  ChartDataPoint,
  ChatMessage,
  PriceAlert,
  PriceSummary,
  Recommendation,
  LocalShop,
  LocalProduct,
  HealthScore,
  PricingAdvice,
  SimulationResult,
  CopilotAction,
  ActivityLogEntry,
  ActivityStats,
  ImpactMetrics,
  ActionItem,
  AdminUser,
  CatalogProduct,
} from "@/lib/types";

const CHART_COLORS = [
  "#2563eb",
  "#f97316",
  "#7c3aed",
  "#0f766e",
  "#dc2626",
  "#0891b2",
  "#ca8a04",
  "#be185d",
];

const CATEGORIES = [
  { id: "all", name: "Semua" },
  { id: "batik", name: "Batik" },
  { id: "kerajinan", name: "Kerajinan" },
  { id: "pangan", name: "Pangan" },
];

type View =
  | "home"
  | "chat"
  | "recommendations"
  | "descriptions"
  | "alerts"
  | "store"
  | "health"
  | "pricing"
  | "simulator"
  | "copilot"
  | "route"
  | "admin"
  | "admin_users"
  | "impact"
  | "buyer_katalog";
type IconName =
  | "map"
  | "home"
  | "plus"
  | "search"
  | "users"
  | "dashboard"
  | "clock"
  | "chart"
  | "chat"
  | "doc"
  | "mic"
  | "send"
  | "bell"
  | "spark"
  | "menu"
  | "x"
  | "store"
  | "arrow"
  | "user"
  | "activity"
  | "dollar"
  | "trending"
  | "list";

import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const [activeView, setActiveView] = useState<View>("home");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myShopData, setMyShopData] = useState<LocalShop | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [priceSummaries, setPriceSummaries] = useState<PriceSummary[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatImagePreview, setChatImagePreview] = useState<string | null>(null);
  const [chatImageFile, setChatImageFile] = useState<File | null>(null);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [descProductName, setDescProductName] = useState("");
  const [descCategory, setDescCategory] = useState("");
  const [descAdditionalInfo, setDescAdditionalInfo] = useState("");
  const [descImage, setDescImage] = useState<string | null>(null);
  const [generatedDesc, setGeneratedDesc] = useState("");
  const [isDescLoading, setIsDescLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [isChatPopupOpen, setIsChatPopupOpen] = useState(false);
  const [descAddModalOpen, setDescAddModalOpen] = useState(false);
  const [descAddPrice, setDescAddPrice] = useState("");
  const [descAddStock, setDescAddStock] = useState("1");
  const chatInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only fetch suggested questions once or separately, as they don't need SSE
    getSuggestedQuestions().then(setSuggestedQuestions).catch(console.error);

    const category = activeCategory === "all" ? "" : activeCategory;
    const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/prices/stream?category=${category}`;

    setIsLoading(true);
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setPriceSummaries(data.summaries || []);
        setRecommendations(data.recs || []);
        setAlerts(data.alerts || []);

        // Group history
        const grouped: Record<string, Record<string, number[]>> = {};
        (data.history || []).forEach((item: any) => {
          const week = new Date(item.recorded_at).toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "short",
          });
          grouped[week] ??= {};
          grouped[week][item.product_name] ??= [];
          grouped[week][item.product_name].push(item.price);
        });

        const points = Object.entries(grouped).map(([week, products]) => {
          const point: ChartDataPoint = { week };
          Object.entries(products).forEach(([name, prices]) => {
            point[name] = Math.round(
              prices.reduce((total, price) => total + price, 0) / prices.length,
            );
          });
          return point;
        });

        setChartData(points);
        setIsLoading(false);
      } catch (err) {
        console.error("Failed to parse SSE data", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE Error", err);
      eventSource.close();
      // Optionally fallback or retry
    };

    return () => {
      eventSource.close();
    };
  }, [activeCategory]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatLoading]);

  // Auth check and fetch user
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    // Fetch user profile
    fetch("http://localhost:8000/api/auth/profile", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Token invalid");
        return res.json();
      })
      .then((data) => {
        setCurrentUser(data);
        if (data.role === "admin") {
          setActiveView("admin");
        } else if (data.role === "buyer") {
          setActiveView("buyer_katalog");
        } else {
          setActiveView("home");
        }
        getMyShop()
          .then((shop) => setMyShopData(shop))
          .catch(() => {});
      })
      .catch(() => {
        localStorage.removeItem("token");
        router.push("/login");
      });
  }, [router]);

  const productNames = useMemo(
    () =>
      Array.from(
        new Set(
          chartData.flatMap((point) =>
            Object.keys(point).filter((key) => key !== "week"),
          ),
        ),
      ),
    [chartData],
  );

  const formatRupiah = (num: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);

  const handleImageSelect = (file: File) => {
    setChatImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setChatImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSendChat = async (message?: string) => {
    const textInput = message || chatInput.trim();
    if (!textInput && !chatImagePreview) return;

    // When only an image is sent without text, use a clear default prompt
    const msg =
      textInput ||
      "Tolong identifikasi dan jelaskan jenis pola batik pada gambar ini.";

    setActiveView("chat");
    setChatMessages((prev) => [
      ...prev,
      { role: "user", content: msg, image: chatImagePreview || undefined },
    ]);
    setChatInput("");
    setIsChatLoading(true);

    const currentImage = chatImagePreview;
    setChatImageFile(null);
    setChatImagePreview(null);

    try {
      let visionContext: string | undefined = undefined;

      if (currentImage) {
        // Scan image with vision model
        try {
          const img = new Image();
          // Fix race condition: attach onload BEFORE setting src
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error("Gagal memuat gambar"));
            img.src = currentImage;
          });
          visionContext = await scanBatikImage(img);
        } catch (imgErr) {
          console.error("Error processing image:", imgErr);
          visionContext =
            "Terjadi kesalahan saat memuat gambar untuk dianalisis.";
        }
      }

      const response = await sendChatMessage(msg, "default", visionContext);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response.response,
          products: response.products,
        },
      ]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Maaf, tidak bisa terhubung ke server. Pastikan backend berjalan di http://localhost:8000.",
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleGenerateDesc = async () => {
    if (!descProductName.trim()) return;

    setIsDescLoading(true);
    try {
      const response = await generateDescription(
        descProductName,
        descCategory,
        descAdditionalInfo,
        descImage,
      );
      setGeneratedDesc(response.description);
    } catch {
      setGeneratedDesc(
        "Gagal menghasilkan deskripsi. Pastikan backend berjalan.",
      );
    } finally {
      setIsDescLoading(false);
    }
  };

  const startNewChat = () => {
    setChatMessages([]);
    setChatInput("");
    setActiveView("home");
    setSidebarOpen(false);
    setTimeout(() => chatInputRef.current?.focus(), 80);
  };

  const focusChat = () => {
    setActiveView("home");
    setSidebarOpen(false);
    setTimeout(() => chatInputRef.current?.focus(), 80);
  };

  return (
    <div className="min-h-screen overflow-hidden bg-app text-slate-950">
      <BackgroundBlobs />

      <div className="relative z-10 flex min-h-screen">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          activeView={activeView}
          alertCount={alerts.filter((alert) => !alert.is_read).length}
          userRole={currentUser?.role || "merchant"}
          onNewChat={startNewChat}
          onNavigate={(view) => {
            setActiveView(view);
            setSidebarOpen(false);
          }}
        />

        <main className="flex min-h-screen flex-1 flex-col px-4 py-4 sm:px-6 lg:pl-0 lg:pr-8">
          <Header
            activeView={activeView}
            sidebarOpen={sidebarOpen}
            storeName={myShopData?.name || "Toko Anda"}
            userRole={currentUser?.role || "merchant"}
            onMenu={() => setSidebarOpen((open) => !open)}
          />

          <div className="flex-1 pb-6 pt-2 lg:pb-2">
            {isLoading ? (
              <LoadingState />
            ) : (
              <>
                {activeView === "home" &&
                  (currentUser?.role === "merchant" || !currentUser?.role) && (
                    <HomeView
                      userName={
                        currentUser?.full_name ||
                        currentUser?.username ||
                        "Pengguna"
                      }
                      priceSummaries={priceSummaries}
                      recommendations={recommendations}
                      alerts={alerts}
                      formatRupiah={formatRupiah}
                      onOpenPrices={() => setPriceModalOpen(true)}
                      onFocusChat={focusChat}
                      onOpenDescription={() => setActiveView("descriptions")}
                    />
                  )}

                {activeView === "buyer_katalog" && (
                  <BuyerKatalogView
                    formatRupiah={formatRupiah}
                    currentUser={currentUser}
                  />
                )}

                {activeView === "chat" && (
                  <ChatThread
                    chatMessages={chatMessages}
                    isChatLoading={isChatLoading}
                    suggestedQuestions={suggestedQuestions}
                    onSend={handleSendChat}
                    chatEndRef={chatEndRef}
                  />
                )}

                {activeView === "recommendations" &&
                  (currentUser?.role === "merchant" || !currentUser?.role) && (
                    <RecommendationsView
                      recommendations={recommendations}
                      formatRupiah={formatRupiah}
                    />
                  )}

                {activeView === "descriptions" &&
                  (currentUser?.role === "merchant" || !currentUser?.role) && (
                    <DescriptionView
                      descProductName={descProductName}
                      setDescProductName={setDescProductName}
                      descCategory={descCategory}
                      setDescCategory={setDescCategory}
                      descAdditionalInfo={descAdditionalInfo}
                      setDescAdditionalInfo={setDescAdditionalInfo}
                      descImage={descImage}
                      setDescImage={setDescImage}
                      generatedDesc={generatedDesc}
                      isDescLoading={isDescLoading}
                      onGenerate={handleGenerateDesc}
                      onAddProduct={() => {
                        if (
                          !descProductName ||
                          !descCategory ||
                          !generatedDesc
                        ) {
                          alert(
                            "Harap lengkapi nama produk, kategori, dan hasilkan deskripsi terlebih dahulu!",
                          );
                          return;
                        }
                        setDescAddModalOpen(true);
                      }}
                    />
                  )}

                {activeView === "alerts" &&
                  (currentUser?.role === "merchant" || !currentUser?.role) && (
                    <AlertsView alerts={alerts} formatRupiah={formatRupiah} />
                  )}

                {activeView === "store" &&
                  (currentUser?.role === "merchant" || !currentUser?.role) && (
                    <MarketplaceView formatRupiah={formatRupiah} />
                  )}

                {activeView === "health" &&
                  (currentUser?.role === "merchant" || !currentUser?.role) && (
                    <HealthScoreView formatRupiah={formatRupiah} />
                  )}

                {activeView === "pricing" &&
                  (currentUser?.role === "merchant" || !currentUser?.role) && (
                    <PricingAdvisorView formatRupiah={formatRupiah} />
                  )}

                {activeView === "simulator" &&
                  (currentUser?.role === "merchant" || !currentUser?.role) && (
                    <SimulatorView formatRupiah={formatRupiah} />
                  )}

                {activeView === "copilot" &&
                  (currentUser?.role === "merchant" || !currentUser?.role) && (
                    <CopilotView />
                  )}

                {activeView === "route" &&
                  (currentUser?.role === "merchant" || !currentUser?.role) && (
                    <RouteView formatRupiah={formatRupiah} />
                  )}

                {activeView === "admin" && currentUser?.role === "admin" && (
                  <AdminPanelView />
                )}

                {activeView === "admin_users" &&
                  currentUser?.role === "admin" && <AdminUserManagementView />}

                {activeView === "impact" && currentUser?.role === "admin" && (
                  <ImpactDashboardView
                    onNavigate={(view) => setActiveView(view)}
                  />
                )}
              </>
            )}
          </div>

          {activeView !== "store" &&
            (activeView === "chat" || isChatPopupOpen ? (
              <FloatingChatInput
                inputRef={chatInputRef}
                value={chatInput}
                isLoading={isChatLoading}
                onChange={setChatInput}
                onSend={() => handleSendChat()}
                onQuickSend={handleSendChat}
                imagePreview={chatImagePreview}
                onImageSelect={handleImageSelect}
                onOpenRouting={() => {
                  setActiveView("route");
                  if (activeView !== "chat") setIsChatPopupOpen(false);
                }}
                onClose={
                  activeView !== "chat"
                    ? () => setIsChatPopupOpen(false)
                    : undefined
                }
              />
            ) : (
              <button
                onClick={() => setIsChatPopupOpen(true)}
                className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#1c1c1e] text-white shadow-xl shadow-slate-900/20 transition hover:-translate-y-1 hover:bg-black lg:right-8"
                aria-label="Buka Chat AI"
              >
                <Icon name="chat" />
              </button>
            ))}
        </main>
      </div>

      {priceModalOpen && (
        <PriceModal
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          priceSummaries={priceSummaries}
          chartData={chartData}
          productNames={productNames}
          recommendations={recommendations}
          formatRupiah={formatRupiah}
          onClose={() => setPriceModalOpen(false)}
        />
      )}

      {descAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md p-6 bg-white rounded-3xl shadow-2xl animate-soft-enter border border-slate-100">
            <h3 className="text-xl font-black text-slate-900 mb-4">
              Konfirmasi Tambah Produk
            </h3>
            <div className="space-y-4 text-sm text-slate-700">
              <div>
                <strong className="text-xs uppercase text-slate-500 block mb-1">
                  Nama Produk:
                </strong>{" "}
                {descProductName}
              </div>
              <div>
                <strong className="text-xs uppercase text-slate-500 block mb-1">
                  Kategori:
                </strong>{" "}
                {descCategory}
              </div>
              <div className="max-h-32 overflow-y-auto bg-slate-50 p-2 rounded-xl text-xs">
                <strong className="text-xs uppercase text-slate-500 block mb-1">
                  Deskripsi:
                </strong>{" "}
                {generatedDesc}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Harga (Rp)
                  </label>
                  <input
                    required
                    type="number"
                    placeholder="Contoh: 50000"
                    value={descAddPrice}
                    onChange={(e) => setDescAddPrice(e.target.value)}
                    className="w-full bg-slate-100/50 border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-violet-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Stok Awal
                  </label>
                  <input
                    required
                    type="number"
                    value={descAddStock}
                    onChange={(e) => setDescAddStock(e.target.value)}
                    className="w-full bg-slate-100/50 border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-violet-400"
                  />
                </div>
              </div>
            </div>
            <div className="pt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDescAddModalOpen(false)}
                className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!descAddPrice || parseInt(descAddPrice) <= 0}
                onClick={async () => {
                  if (!descAddPrice || parseInt(descAddPrice) <= 0) {
                    alert("Harap masukkan harga yang valid.");
                    return;
                  }
                  try {
                    await addMyProduct({
                      name: descProductName,
                      category: descCategory,
                      price: parseInt(descAddPrice),
                      stock: parseInt(descAddStock) || 1,
                      description: generatedDesc,
                    });
                    alert("Produk berhasil ditambahkan ke toko Anda!");
                    setDescAddModalOpen(false);
                  } catch (err) {
                    alert("Gagal menambahkan produk.");
                  }
                }}
                className={`px-4 py-2 font-bold text-white rounded-xl transition-colors shadow-lg ${!descAddPrice || parseInt(descAddPrice) <= 0 ? "bg-slate-400 cursor-not-allowed shadow-none" : "bg-violet-600 hover:bg-violet-700 shadow-violet-600/20"}`}
              >
                Upload ke Toko
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BackgroundBlobs() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#f7f8fc]" />
      <div className="absolute -left-28 -top-24 h-96 w-96 rounded-full bg-sky-200/70 blur-3xl" />
      <div className="absolute right-[-10%] top-14 h-[28rem] w-[28rem] rounded-full bg-orange-200/60 blur-3xl" />
      <div className="absolute bottom-[-12rem] left-1/3 h-[30rem] w-[30rem] rounded-full bg-violet-200/60 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(255,255,255,0.95),rgba(255,255,255,0)_50%)]" />
    </div>
  );
}

function Sidebar({
  open,
  activeView,
  alertCount,
  userRole = "merchant",
  onClose,
  onNewChat,
  onNavigate,
}: {
  open: boolean;
  activeView: View;
  alertCount: number;
  userRole?: string;
  onClose: () => void;
  onNewChat: () => void;
  onNavigate: (view: View) => void;
}) {
  const router = useRouter();
  const allItems: {
    label: string;
    icon: IconName;
    view?: View;
    roles: string[];
    onClick?: () => void;
  }[] = [
    {
      label: "Dashboard Utama",
      icon: "home",
      view: "home",
      roles: ["merchant"],
    },
    {
      label: "Katalog & AI Matchmaker",
      icon: "spark",
      view: "buyer_katalog",
      roles: ["buyer"],
    },
    {
      label: "Dashboard Monitoring",
      icon: "dashboard",
      view: "admin",
      roles: ["admin"],
    },
    {
      label: "Kelola Pengguna",
      icon: "users",
      view: "admin_users",
      roles: ["admin"],
    },
    {
      label: "Smart Health Score",
      icon: "activity",
      view: "health",
      roles: ["merchant"],
    },
    {
      label: "AI Pricing Advisor",
      icon: "dollar",
      view: "pricing",
      roles: ["merchant"],
    },
    {
      label: "What-if Simulator",
      icon: "trending",
      view: "simulator",
      roles: ["merchant"],
    },
    {
      label: "Business Copilot",
      icon: "list",
      view: "copilot",
      roles: ["merchant"],
    },
    {
      label: "Rekomendasi Waktu Jual",
      icon: "spark",
      view: "recommendations",
      roles: ["merchant"],
    },
    {
      label: "Generator Deskripsi",
      icon: "doc",
      view: "descriptions",
      roles: ["merchant"],
    },
    {
      label: "Alert Harga Anomali",
      icon: "bell",
      view: "alerts",
      roles: ["merchant"],
    },
    { label: "Rute Pintar", icon: "map", view: "route", roles: ["merchant"] },
    { label: "Kelola Toko", icon: "store", view: "store", roles: ["merchant"] },
    {
      label: "Ruang Tanya AI",
      icon: "chat",
      view: "chat",
      roles: ["merchant", "buyer", "admin"],
    },
    {
      label: "Profil",
      icon: "user",
      roles: ["merchant", "buyer", "admin"],
      onClick: () => {
        router.push("/profile");
        onClose();
      },
    },
  ];

  const items = allItems.filter((item) => item.roles.includes(userRole));

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-50 transition-all duration-300 lg:sticky lg:top-0 lg:h-screen ${
          open
            ? "w-24 px-4 py-4 translate-x-0"
            : "w-0 px-0 py-0 -translate-x-full opacity-0 overflow-hidden"
        }`}
      >
        <div className="glass-panel flex h-full flex-col items-center justify-between rounded-[2rem] px-3 py-5">
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              aria-label="Tutup navigasi"
              onClick={onClose}
              className="icon-button"
            >
              <Icon name="x" />
            </button>
            {items.map((item) => {
              const selected = item.view && activeView === item.view;
              return (
                <button
                  key={item.label}
                  type="button"
                  title={item.label}
                  aria-label={item.label}
                  onClick={
                    item.onClick ?? (() => item.view && onNavigate(item.view))
                  }
                  className={`icon-button relative ${selected ? "is-active" : ""}`}
                >
                  <Icon name={item.icon} />
                  {item.view === "alerts" && alertCount > 0 && (
                    <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#1c1c1e] px-1 text-[10px] font-bold text-white">
                      {alertCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            title="PasarPintar AI"
            aria-label="PasarPintar AI"
            onClick={() => onNavigate("home")}
            className="grid h-12 w-12 place-items-center rounded-2xl bg-[#1c1c1e] text-sm font-black text-white shadow-lg shadow-slate-900/15"
          >
            PP
          </button>
        </div>
      </aside>

      {open && (
        <button
          type="button"
          aria-label="Tutup overlay"
          className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}
    </>
  );
}

function Header({
  activeView,
  sidebarOpen,
  storeName,
  userRole = "merchant",
  onMenu,
}: {
  activeView: View;
  sidebarOpen: boolean;
  storeName: string;
  userRole?: string;
  onMenu: () => void;
}) {
  const viewTitle: Record<View, string> = {
    home: "Pasar Klewer Daily - Dashboard Utama",
    chat: "Ruang Tanya AI",
    recommendations: "Rekomendasi Waktu Jual",
    descriptions: "Generator Deskripsi Digital",
    alerts: "Alert Harga Anomali",
    health: "Smart Business Health Score",
    pricing: "AI Pricing Advisor",
    simulator: "What-if Business Simulator",
    copilot: "Business Copilot Action Plan",
    route: "Rute Pintar Antar Hemat",
    store: "Kelola Toko & Finansial",
    admin: "Dashboard Monitoring Ekosistem",
    admin_users: "Kelola Pengguna",
    impact: "Smart Impact Dashboard Solo Raya",
    buyer_katalog: "Katalog Solo Raya & AI Matchmaker",
  };

  const roleLabel: Record<string, { label: string; bg: string }> = {
    merchant: { label: "Pedagang", bg: "bg-emerald-500" },
    buyer: { label: "Pembeli", bg: "bg-blue-500" },
    admin: { label: "Admin", bg: "bg-purple-600" },
  };

  const currentRole = roleLabel[userRole] || roleLabel.merchant;

  return (
    <header className="glass-panel sticky top-4 z-30 flex items-center justify-between gap-4 rounded-[1.75rem] px-4 py-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          aria-label="Buka navigasi"
          onClick={onMenu}
          className={`icon-button transition-opacity duration-300 ${
            sidebarOpen ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <Icon name="menu" />
        </button>
        <button className="hidden items-center gap-2 rounded-full bg-white/60 px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-white/70 sm:flex">
          PasarPintar AI v1.0
          <Icon name="arrow" className="h-4 w-4" />
        </button>
      </div>

      <p className="truncate text-center text-sm font-semibold text-slate-600 sm:text-base">
        {viewTitle[activeView]}
      </p>

      <div className="flex items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-black text-white shadow-sm ${currentRole.bg}`}
        >
          {currentRole.label}
        </span>
        {userRole === "merchant" && (
          <div className="dark-pill shrink-0">
            <Icon name="store" className="h-4 w-4" />
            <span className="hidden sm:inline">{storeName || "Toko Anda"}</span>
          </div>
        )}
      </div>
    </header>
  );
}

function HomeView({
  userName,
  priceSummaries,
  recommendations,
  alerts,
  formatRupiah,
  onOpenPrices,
  onFocusChat,
  onOpenDescription,
}: {
  userName: string;
  priceSummaries: PriceSummary[];
  recommendations: Recommendation[];
  alerts: PriceAlert[];
  formatRupiah: (num: number) => string;
  onOpenPrices: () => void;
  onFocusChat: () => void;
  onOpenDescription: () => void;
}) {
  const topRecommendation = recommendations[0];
  const watched = priceSummaries.length;
  const upward = priceSummaries.filter((item) => item.trend === "naik").length;

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-4 pt-2 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-8">
      <div className="min-w-0">
        <div className="animate-soft-enter">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 sm:text-sm">
            Untuk pedagang UMKM Solo Raya
          </p>
          <h1 className="max-w-4xl text-4xl font-bold leading-[1.05] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            Halo {userName}, Siap Laris Manis Hari Ini?
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Pantau harga pasar, tanya strategi jualan, dan buat materi produk
            dalam satu asisten yang ringan untuk dipakai setiap hari.
          </p>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <ActionCard
            delay="0ms"
            icon="chart"
            tint="orange"
            title="Dashboard Harga Pasar"
            body="Pantau tren harga pasar Solo Raya secara real-time. Jangan sampai jual kemurahan."
            label="Cek Harga Pasar"
            onClick={onOpenPrices}
          />
          <ActionCard
            delay="110ms"
            icon="chat"
            tint="blue"
            title="AI Chat Assistant"
            body="Tanya apa saja seputar strategi jualan, prediksi harga, dan rekomendasi stok."
            label="Tanya Asisten"
            onClick={onFocusChat}
          />
          <ActionCard
            delay="220ms"
            icon="doc"
            tint="violet"
            title="Generator Deskripsi Produk"
            body="Buat copywriting jualan online otomatis dari nama produk dan detail singkat."
            label="Buat Deskripsi"
            onClick={onOpenDescription}
          />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <MetricCard
            label="Produk Dipantau"
            value={String(watched)}
            sub="item aktif"
          />
          <MetricCard
            label="Harga Naik"
            value={String(upward)}
            sub="perlu dicek"
          />
          <MetricCard
            label="Alert Baru"
            value={String(alerts.filter((alert) => !alert.is_read).length)}
            sub="anomali pasar"
          />
        </div>
      </div>

      <div className="relative min-h-[320px] lg:min-h-[420px]">
        <Mascot />
        <div className="glass-panel absolute bottom-0 left-0 right-0 rounded-[1.75rem] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Rekomendasi cepat
          </p>
          <h2 className="mt-2 text-xl font-bold text-slate-950">
            {topRecommendation?.product_name ?? "Batik Solo Premium"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {topRecommendation?.reason ??
              "Data pasar siap membantu menentukan momentum jual terbaik."}
          </p>
          {topRecommendation && (
            <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/60 px-4 py-3 ring-1 ring-white/70">
              <span className="text-sm text-slate-500">Harga saat ini</span>
              <span className="font-bold text-slate-950">
                {formatRupiah(topRecommendation.current_price)}
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Mascot() {
  return (
    <div className="mascot-wrap">
      <div className="relative w-full max-w-[320px] origin-top scale-90 lg:scale-[0.85]">
        <div className="speech-pop">Monggo, ada yang bisa dibantu?</div>
        <div className="mascot mx-auto">
          <div className="blangkon" />
          <div className="mascot-head">
            <span />
            <span />
          </div>
          <div className="mascot-body">
            <div className="mascot-badge">AI</div>
          </div>
          <div className="mascot-arm left" />
          <div className="mascot-arm right" />
        </div>
      </div>
    </div>
  );
}

function ActionCard({
  icon,
  tint,
  title,
  body,
  label,
  delay,
  onClick,
}: {
  icon: IconName;
  tint: "orange" | "blue" | "violet";
  title: string;
  body: string;
  label: string;
  delay: string;
  onClick: () => void;
}) {
  const tintClass = {
    orange: "bg-orange-100 text-orange-600",
    blue: "bg-sky-100 text-sky-600",
    violet: "bg-violet-100 text-violet-600",
  }[tint];

  return (
    <button
      type="button"
      onClick={onClick}
      style={{ animationDelay: delay }}
      className="glass-card group animate-card-up p-5 text-left"
    >
      <span
        className={`grid h-12 w-12 place-items-center rounded-2xl ${tintClass}`}
      >
        <Icon name={icon} />
      </span>
      <h2 className="mt-5 text-lg font-bold text-slate-950">{title}</h2>
      <p className="mt-3 min-h-[72px] text-sm leading-6 text-slate-600">
        {body}
      </p>
      <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-slate-950">
        {label}
        <Icon
          name="arrow"
          className="h-4 w-4 transition-transform group-hover:translate-x-1"
        />
      </span>
    </button>
  );
}

function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="glass-panel rounded-[1.5rem] p-4">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <div className="mt-2 flex items-end gap-2">
        <p className="text-3xl font-black text-slate-950">{value}</p>
        <p className="pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
          {sub}
        </p>
      </div>
    </div>
  );
}

function PriceModal({
  activeCategory,
  setActiveCategory,
  priceSummaries,
  chartData,
  productNames,
  recommendations,
  formatRupiah,
  onClose,
}: {
  activeCategory: string;
  setActiveCategory: (value: string) => void;
  priceSummaries: PriceSummary[];
  chartData: ChartDataPoint[];
  productNames: string[];
  recommendations: Recommendation[];
  formatRupiah: (num: number) => string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/25 p-4 backdrop-blur-sm">
      <div className="glass-modal max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[2rem] p-5 sm:p-7">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-500">
              Dashboard Harga Pasar
            </p>
            <h2 className="text-2xl font-black text-slate-950 sm:text-3xl">
              Tren Harga Solo Raya
            </h2>
          </div>
          <button
            type="button"
            aria-label="Tutup dashboard harga"
            onClick={onClose}
            className="icon-button"
          >
            <Icon name="x" />
          </button>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setActiveCategory(category.id)}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                activeCategory === category.id
                  ? "bg-[#1c1c1e] text-white"
                  : "bg-white/60 text-slate-600 ring-1 ring-white/70 hover:bg-white/80"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          <div className="rounded-[1.5rem] bg-white/55 p-4 ring-1 ring-white/70">
            <div className="h-[380px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    {productNames.map((name, index) => (
                      <linearGradient
                        key={name}
                        id={`color-${index}`}
                        x1="0"
                        x2="0"
                        y1="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={CHART_COLORS[index % CHART_COLORS.length]}
                          stopOpacity={0.28}
                        />
                        <stop
                          offset="95%"
                          stopColor={CHART_COLORS[index % CHART_COLORS.length]}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid stroke="#dbe3ef" strokeDasharray="3 3" />
                  <XAxis dataKey="week" fontSize={12} stroke="#64748b" />
                  <YAxis
                    fontSize={12}
                    stroke="#64748b"
                    tickFormatter={(value) => `${Number(value) / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(255,255,255,0.92)",
                      border: "1px solid rgba(255,255,255,0.8)",
                      borderRadius: "18px",
                      boxShadow: "0 18px 40px rgba(15,23,42,0.12)",
                    }}
                    formatter={(value) => formatRupiah(Number(value))}
                  />
                  <Legend />
                  {productNames.map((name, index) => (
                    <Area
                      key={name}
                      dataKey={name}
                      fill={`url(#color-${index})`}
                      stroke={CHART_COLORS[index % CHART_COLORS.length]}
                      strokeWidth={2.4}
                      type="monotone"
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-3">
            {recommendations.slice(0, 4).map((rec) => (
              <RecommendationMini
                key={rec.product_id}
                rec={rec}
                formatRupiah={formatRupiah}
              />
            ))}
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-[1.5rem] bg-white/55 ring-1 ring-white/70">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-slate-200/70 text-left text-slate-500">
                <th className="px-4 py-3 font-bold">Produk</th>
                <th className="px-4 py-3 font-bold">Kategori</th>
                <th className="px-4 py-3 text-right font-bold">Harga</th>
                <th className="px-4 py-3 text-right font-bold">Perubahan</th>
                <th className="px-4 py-3 text-right font-bold">Rata-rata</th>
              </tr>
            </thead>
            <tbody>
              {priceSummaries.map((summary) => (
                <tr
                  key={summary.product_id}
                  className="border-b border-slate-200/60 last:border-0"
                >
                  <td className="px-4 py-4 font-bold text-slate-900">
                    {summary.product_name}
                  </td>
                  <td className="px-4 py-4 capitalize text-slate-600">
                    {summary.category}
                  </td>
                  <td className="px-4 py-4 text-right font-bold text-slate-950">
                    {formatRupiah(summary.current_price)}
                    <span className="ml-1 text-xs font-medium text-slate-400">
                      /{summary.unit}
                    </span>
                  </td>
                  <td
                    className={`px-4 py-4 text-right font-bold ${
                      summary.change_percentage > 0
                        ? "text-emerald-600"
                        : summary.change_percentage < 0
                          ? "text-red-500"
                          : "text-slate-500"
                    }`}
                  >
                    {summary.change_percentage > 0 ? "+" : ""}
                    {summary.change_percentage.toFixed(1)}%
                  </td>
                  <td className="px-4 py-4 text-right text-slate-600">
                    {formatRupiah(summary.avg_price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RecommendationMini({
  rec,
  formatRupiah,
}: {
  rec: Recommendation;
  formatRupiah: (num: number) => string;
}) {
  return (
    <div className="rounded-[1.5rem] bg-white/55 p-4 ring-1 ring-white/70">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-950">{rec.product_name}</h3>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {labelAction(rec.action)}
          </p>
        </div>
        <span className="rounded-full bg-[#1c1c1e] px-3 py-1 text-xs font-bold text-white">
          {rec.confidence}%
        </span>
      </div>
      <p className="mt-3 text-sm font-bold text-slate-950">
        {formatRupiah(rec.current_price)}
        <span className="text-xs font-medium text-slate-400">/{rec.unit}</span>
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{rec.reason}</p>
    </div>
  );
}

function ChatThread({
  chatMessages,
  isChatLoading,
  suggestedQuestions,
  onSend,
  chatEndRef,
}: {
  chatMessages: ChatMessage[];
  isChatLoading: boolean;
  suggestedQuestions: string[];
  onSend: (message?: string) => void;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-220px)] w-full max-w-4xl animate-thread-in flex-col">
      {chatMessages.length === 0 ? (
        <div className="glass-panel my-auto rounded-[2rem] p-8 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-sky-100 text-sky-600">
            <Icon name="chat" className="h-8 w-8" />
          </div>
          <h1 className="mt-5 text-3xl font-black text-slate-950">
            Tanya PasarPintar AI
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
            Pilih salah satu pertanyaan cepat atau langsung ketik di input
            bawah.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {suggestedQuestions.slice(0, 4).map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => onSend(question)}
                className="rounded-2xl bg-white/60 p-4 text-left text-sm font-semibold leading-6 text-slate-700 ring-1 ring-white/70 transition hover:-translate-y-1 hover:bg-white/80"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-5 py-4">
          {chatMessages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[84%] rounded-[1.5rem] px-5 py-4 text-sm leading-7 shadow-sm ${
                  message.role === "user"
                    ? "bg-[#1c1c1e] text-white"
                    : "bg-white/70 text-slate-700 ring-1 ring-white/80"
                }`}
              >
                {message.image && (
                  <div className="mb-2">
                    <img
                      src={message.image}
                      alt="User Upload"
                      className="max-w-full rounded-xl object-contain sm:max-w-[240px]"
                    />
                  </div>
                )}
                <p className="whitespace-pre-wrap">{message.content}</p>
                {message.products && message.products.length > 0 && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {message.products.map((p) => (
                      <div
                        key={p.id}
                        className="glass-card flex flex-col justify-between overflow-hidden p-4"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="rounded-full bg-slate-900/10 px-2.5 py-0.5 text-[10px] font-black uppercase text-slate-600">
                              {p.category}
                            </span>
                            <span className="text-xs font-bold text-slate-500">
                              📍 {p.shop.distance_km} km
                            </span>
                          </div>
                          <h4 className="mt-2 text-base font-black leading-tight text-slate-900">
                            {p.name}
                          </h4>
                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            🏢 {p.shop.name} - {p.shop.district}
                          </p>
                          <p className="mt-2 text-sm font-bold text-slate-900">
                            Rp {p.price.toLocaleString("id-ID")}
                          </p>
                        </div>
                        <a
                          href={`https://wa.me/${p.shop.whatsapp}?text=Halo%20${encodeURIComponent(p.shop.name)},%20saya%20melihat%20produk%20${encodeURIComponent(p.name)}%20di%20PasarPintar...`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-4 block w-full rounded-full bg-[#1c1c1e] px-4 py-2 text-center text-xs font-bold text-white transition hover:bg-black"
                        >
                          Tanya WhatsApp
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isChatLoading && (
            <div className="flex justify-start">
              <div className="rounded-[1.5rem] bg-white/70 px-5 py-4 ring-1 ring-white/80">
                <div className="flex gap-1.5">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0.1s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0.2s]" />
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      )}
    </section>
  );
}

function RecommendationsView({
  recommendations,
  formatRupiah,
}: {
  recommendations: Recommendation[];
  formatRupiah: (num: number) => string;
}) {
  return (
    <section className="mx-auto w-full max-w-6xl animate-soft-enter">
      <PageTitle
        eyebrow="Momentum jual"
        title="Rekomendasi AI untuk stok dan harga"
      />
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {recommendations.map((rec) => (
          <div key={rec.product_id} className="glass-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-950">
                  {rec.product_name}
                </h2>
                <p className="mt-1 text-sm capitalize text-slate-500">
                  {rec.category}
                </p>
              </div>
              <span className="dark-pill text-xs">
                {labelAction(rec.action)}
              </span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/60 p-4 ring-1 ring-white/70">
                <p className="text-xs font-semibold text-slate-500">Harga</p>
                <p className="mt-1 font-black text-slate-950">
                  {formatRupiah(rec.current_price)}
                </p>
              </div>
              <div className="rounded-2xl bg-white/60 p-4 ring-1 ring-white/70">
                <p className="text-xs font-semibold text-slate-500">
                  Perubahan
                </p>
                <p
                  className={`mt-1 font-black ${
                    rec.change_percentage > 0
                      ? "text-emerald-600"
                      : "text-red-500"
                  }`}
                >
                  {rec.change_percentage > 0 ? "+" : ""}
                  {rec.change_percentage.toFixed(1)}%
                </p>
              </div>
            </div>
            <div className="mt-5">
              <div className="mb-2 flex justify-between text-xs font-bold text-slate-500">
                <span>Confidence</span>
                <span>{rec.confidence}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/70">
                <div
                  className="h-2 rounded-full bg-[#1c1c1e]"
                  style={{ width: `${rec.confidence}%` }}
                />
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              {rec.reason}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function DescriptionView({
  descProductName,
  setDescProductName,
  descCategory,
  setDescCategory,
  descAdditionalInfo,
  setDescAdditionalInfo,
  descImage,
  setDescImage,
  generatedDesc,
  isDescLoading,
  onGenerate,
  onAddProduct,
}: {
  descProductName: string;
  setDescProductName: (value: string) => void;
  descCategory: string;
  setDescCategory: (value: string) => void;
  descAdditionalInfo: string;
  setDescAdditionalInfo: (value: string) => void;
  descImage: string | null;
  setDescImage: (value: string | null) => void;
  generatedDesc: string;
  isDescLoading: boolean;
  onGenerate: () => void;
  onAddProduct: () => void;
}) {
  return (
    <section className="mx-auto grid w-full max-w-6xl animate-soft-enter gap-5 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="glass-card p-6 flex flex-col gap-6">
        <PageTitle eyebrow="Vision AI" title="Generator Deskripsi" />

        <div className="space-y-4">
          <Field label="Foto Produk (Opsional)">
            <label className="group relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white/50 py-8 transition hover:border-violet-500 hover:bg-violet-50/50">
              {descImage ? (
                <div className="absolute inset-0 overflow-hidden rounded-2xl">
                  <img
                    src={descImage}
                    alt="Preview"
                    className="h-full w-full object-cover opacity-30 blur-sm"
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/40">
                    <Icon name="spark" />
                    <span className="mt-2 text-sm font-bold text-slate-800">
                      Ganti Foto
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="rounded-full bg-slate-100 p-3 text-slate-400 group-hover:bg-violet-100 group-hover:text-violet-600 transition">
                    <Icon name="plus" />
                  </div>
                  <span className="text-sm font-semibold text-slate-500 group-hover:text-violet-600">
                    Klik untuk upload foto
                  </span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () =>
                      setDescImage(reader.result as string);
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </label>
            {descImage && (
              <button
                type="button"
                onClick={() => setDescImage(null)}
                className="mt-2 text-xs font-bold text-red-500 hover:text-red-600"
              >
                Hapus Foto
              </button>
            )}
          </Field>

          <div className="h-px w-full bg-slate-200" />
          <Field label="Nama Produk">
            <input
              value={descProductName}
              onChange={(event) => setDescProductName(event.target.value)}
              placeholder="Batik Tulis Laweyan Premium"
              className="field-input"
            />
          </Field>
          <Field label="Kategori">
            <select
              value={descCategory}
              onChange={(event) => setDescCategory(event.target.value)}
              className="field-input"
            >
              <option value="">Pilih kategori</option>
              <option value="batik">Batik</option>
              <option value="kerajinan">Kerajinan</option>
              <option value="pangan">Pangan</option>
            </select>
          </Field>
          <Field label="Info Tambahan">
            <textarea
              value={descAdditionalInfo}
              onChange={(event) => setDescAdditionalInfo(event.target.value)}
              placeholder="Bahan, ukuran, motif, keunikan produk, target pembeli..."
              rows={5}
              className="field-input resize-none rounded-[1.25rem]"
            />
          </Field>
          <button
            type="button"
            onClick={onGenerate}
            disabled={isDescLoading || (!descProductName.trim() && !descImage)}
            className="dark-pill w-full justify-center py-4 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="spark" />
            {isDescLoading ? "Menganalisis..." : "Generate Deskripsi"}
          </button>
        </div>
      </div>

      <div className="glass-panel rounded-[2rem] p-6 flex flex-col">
        <p className="text-sm font-bold text-slate-500 mb-4">Hasil Generasi</p>

        {isDescLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center opacity-70">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
            <p className="mt-4 font-bold text-slate-500 animate-pulse">
              Vision AI sedang menganalisis foto Anda...
            </p>
          </div>
        ) : generatedDesc ? (
          <div className="flex flex-col gap-6">
            {descImage && (
              <div className="group relative mx-auto w-full max-w-md overflow-hidden rounded-3xl bg-white p-3 shadow-2xl ring-1 ring-black/5 transition-all hover:scale-[1.02]">
                <div className="absolute -inset-2 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-orange-500 opacity-20 blur-xl transition group-hover:opacity-40" />
                <div className="relative aspect-square overflow-hidden rounded-2xl">
                  <img
                    src={descImage}
                    alt="Produk"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 backdrop-blur-md">
                    <Icon name="spark" />
                    <span className="text-xs font-bold text-white">
                      AI Vision Analyzed
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-[1.5rem] bg-white/65 p-6 text-sm leading-8 text-slate-800 ring-1 ring-white/70 shadow-inner">
              <p className="whitespace-pre-wrap">{generatedDesc}</p>
            </div>

            <div className="mt-4 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(generatedDesc)}
                className="rounded-full bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:-translate-y-1 hover:shadow-xl"
              >
                Salin Deskripsi
              </button>
              <button
                type="button"
                onClick={onAddProduct}
                className="flex items-center gap-2 rounded-full bg-violet-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-violet-600/20 transition hover:-translate-y-1 hover:bg-violet-700 hover:shadow-xl"
              >
                <Icon name="plus" className="h-4 w-4" />
                Tambah Produk
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-1 items-center justify-center rounded-[1.5rem] bg-white/45 p-6 text-center text-sm leading-6 text-slate-500 ring-1 ring-white/60">
            Upload foto produk Anda dan biarkan AI mengenali dan membuatkan
            deskripsi jualan yang menarik secara otomatis!
          </div>
        )}
      </div>
    </section>
  );
}

function AlertsView({
  alerts,
  formatRupiah,
}: {
  alerts: PriceAlert[];
  formatRupiah: (num: number) => string;
}) {
  return (
    <section className="mx-auto w-full max-w-5xl animate-soft-enter">
      <PageTitle eyebrow="Notifikasi pasar" title="Alert Harga Anomali" />
      <div className="mt-6 space-y-3">
        {alerts.length === 0 ? (
          <div className="glass-panel rounded-[2rem] p-10 text-center text-slate-600">
            Semua harga dalam batas normal.
          </div>
        ) : (
          alerts.map((alert) => (
            <div key={alert.id} className="glass-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-950">
                    {alert.product_name}
                  </h2>
                  <p className="mt-1 text-sm capitalize text-slate-500">
                    {alert.category}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`font-black ${
                      alert.alert_type === "naik"
                        ? "text-emerald-600"
                        : "text-red-500"
                    }`}
                  >
                    {alert.alert_type === "naik" ? "+" : "-"}
                    {Math.abs(alert.percentage_change).toFixed(1)}%
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(alert.created_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
              <p className="mt-4 rounded-2xl bg-white/60 p-4 text-sm leading-6 text-slate-600 ring-1 ring-white/70">
                {alert.message}
              </p>
              <p className="mt-3 text-xs font-semibold text-slate-400">
                Estimasi nilai pantauan:{" "}
                {formatRupiah(Math.abs(alert.percentage_change) * 1000)}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function FloatingChatInput({
  value,
  isLoading,
  onChange,
  onSend,
  onQuickSend,
  onOpenRouting,
  inputRef,
  onClose,
  imagePreview,
  onImageSelect,
}: {
  value: string;
  isLoading: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
  onQuickSend: (message: string) => void;
  onOpenRouting: () => void;
  inputRef: React.Ref<HTMLInputElement>;
  onClose?: () => void;
  imagePreview?: string | null;
  onImageSelect?: (file: File) => void;
}) {
  const prompts = [
    "Grafik Harga Batik",
    "Kapan waktu jual terbaik?",
    "Bandingkan harga saya",
  ];

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-4xl lg:left-32">
      {onClose && (
        <div className="absolute -top-12 right-0 flex justify-end">
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-500 shadow-md hover:bg-slate-100 hover:text-slate-800"
          >
            <Icon name="x" />
          </button>
        </div>
      )}
      <div className="mb-2 mx-auto w-fit rounded-full bg-white/45 px-4 py-2 text-xs font-bold text-slate-500 backdrop-blur-xl ring-1 ring-white/70">
        Tingkatkan penjualan UMKM Anda
      </div>
      {imagePreview && (
        <div className="mb-2 w-fit rounded-xl bg-white p-2 shadow-md">
          <img
            src={imagePreview}
            alt="Preview"
            className="h-20 w-20 rounded-md object-cover"
          />
        </div>
      )}
      <div className="floating-input">
        <label
          className="icon-button cursor-pointer"
          aria-label="Unggah Gambar"
        >
          <Icon name="plus" />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0] && onImageSelect) {
                onImageSelect(e.target.files[0]);
              }
            }}
          />
        </label>
        <button
          type="button"
          aria-label="Mikrofon"
          className="icon-button hidden sm:flex"
        >
          <Icon name="mic" />
        </button>
        <input
          ref={inputRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && onSend()}
          placeholder="Berapa harga wajar kain batik cap minggu ini?"
          className="min-w-0 flex-1 bg-transparent px-2 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none sm:text-base"
        />
        <button
          type="button"
          aria-label="Kirim pesan"
          onClick={onSend}
          disabled={isLoading || (!value.trim() && !imagePreview)}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#1c1c1e] text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Icon name="send" />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onQuickSend(prompt)}
            className="rounded-full bg-[#1c1c1e] px-4 py-2 text-xs font-bold text-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-black sm:text-sm"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Quick Action Pills Fitur Hackathon */}
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => onQuickSend("Cari produk lokal terdekat")}
          className="flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-xs font-bold text-white shadow-xl shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-800 sm:text-sm"
        >
          <span className="text-base">🔍</span> Cari Produk Lokal
        </button>
        <button
          type="button"
          onClick={onOpenRouting}
          className="flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-xs font-bold text-white shadow-xl shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-800 sm:text-sm"
        >
          <span className="text-base">🗺️</span> Rute Antar Hemat
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-600">
        {label}
      </span>
      {children}
    </label>
  );
}

function PageTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
        {eyebrow}
      </p>
      <h1 className="mt-2 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">
        {title}
      </h1>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center">
      <div className="glass-panel rounded-[2rem] px-8 py-7 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[#1c1c1e] font-black text-white">
          PP
        </div>
        <p className="text-sm font-semibold text-slate-500">
          Memuat data pasar...
        </p>
      </div>
    </div>
  );
}

function labelAction(action: Recommendation["action"]) {
  if (action === "jual_sekarang") return "Jual Sekarang";
  if (action === "beli_stok") return "Beli Stok";
  return "Tahan";
}

function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: IconName;
  className?: string;
}) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2,
    viewBox: "0 0 24 24",
    className,
  };

  return (
    <svg {...common} aria-hidden="true">
      {name === "home" && (
        <>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </>
      )}
      {name === "plus" && <path d="M12 5v14M5 12h14" />}
      {name === "search" && (
        <path d="m21 21-4.3-4.3M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z" />
      )}
      {name === "clock" && (
        <path d="M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      )}
      {name === "chart" && (
        <path d="M4 19V5M4 19h16M8 16v-5M12 16V8M16 16v-8M20 16v-3" />
      )}
      {name === "chat" && (
        <path d="M21 12a8 8 0 0 1-8 8H6l-3 2 1.4-4.2A8 8 0 1 1 21 12Z" />
      )}
      {name === "doc" && <path d="M7 3h7l4 4v14H7zM14 3v5h5M9 13h6M9 17h6" />}
      {name === "mic" && (
        <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3ZM5 11a7 7 0 0 0 14 0M12 18v3" />
      )}
      {name === "send" && <path d="m22 2-7 20-4-9-9-4 20-7ZM11 13l4-4" />}
      {name === "bell" && (
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
      )}
      {name === "spark" && (
        <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3ZM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z" />
      )}
      {name === "menu" && <path d="M4 7h16M4 12h16M4 17h16" />}
      {name === "x" && <path d="M18 6 6 18M6 6l12 12" />}
      {name === "store" && (
        <path d="M4 10h16l-1-5H5l-1 5ZM6 10v9h12v-9M9 19v-5h6v5" />
      )}
      {name === "arrow" && <path d="M5 12h14M13 6l6 6-6 6" />}
      {name === "user" && (
        <path d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM5 21a7 7 0 0 1 14 0" />
      )}
      {name === "users" && (
        <>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </>
      )}
      {name === "dashboard" && (
        <>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
        </>
      )}
      {name === "activity" && <path d="M22 12h-4l-3 9L9 3l-3 9H2" />}
      {name === "dollar" && (
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      )}
      {name === "trending" && <path d="m3 17 6-6 4 4 8-8M17 7h4v4" />}
      {name === "list" && (
        <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
      )}
      {name === "map" && (
        <>
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </>
      )}
    </svg>
  );
}

function RouteView({
  formatRupiah,
}: {
  formatRupiah: (num: number) => string;
}) {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  const [destinations, setDestinations] = useState<string[]>([]);
  const [availableDestinations] = useState([
    "Laweyan",
    "Serengan",
    "Pasar Kliwon",
    "Jebres",
    "Banjarsari",
    "Grogol",
    "Kartasura",
    "Baki",
    "Colomadu",
    "Mojolaban",
  ]);
  const [routeResult, setRouteResult] = useState<any>(null);
  const [directionsResponse, setDirectionsResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (
      !isLoaded ||
      !routeResult ||
      !routeResult.optimized_order ||
      routeResult.optimized_order.length < 2
    ) {
      setDirectionsResponse(null);
      return;
    }

    const directionsService = new (
      window as any
    ).google.maps.DirectionsService();
    const order = routeResult.optimized_order;

    const origin = order[0] + ", Solo, Indonesia";
    const destination = order[order.length - 1] + ", Solo, Indonesia";
    const waypoints = order.slice(1, -1).map((loc: string) => ({
      location: loc + ", Solo, Indonesia",
      stopover: true,
    }));

    directionsService.route(
      {
        origin: origin,
        destination: destination,
        waypoints: waypoints,
        travelMode: (window as any).google.maps.TravelMode.DRIVING,
      },
      (result: any, status: any) => {
        if (status === (window as any).google.maps.DirectionsStatus.OK) {
          setDirectionsResponse(result);
          setError("");
        } else {
          console.error("Gagal mendapatkan rute peta:", result, status);
          setError(
            "Gagal merender rute di peta. Pastikan Directions API sudah aktif di Google Cloud Console Anda. Status: " +
              status,
          );
        }
      },
    );
  }, [routeResult, isLoaded]);

  const toggleDestination = (dest: string) => {
    if (destinations.includes(dest)) {
      setDestinations(destinations.filter((d) => d !== dest));
    } else {
      if (destinations.length >= 5) {
        setError("Maksimal 5 lokasi untuk demo ini");
        return;
      }
      setDestinations([...destinations, dest]);
      setError("");
    }
    setRouteResult(null);
  };

  const handleOptimize = async () => {
    if (destinations.length < 2) {
      setError("Pilih minimal 2 lokasi untuk mengoptimasi rute.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const { optimizeRoute } = await import("@/lib/api");
      const res = await optimizeRoute(destinations);
      setRouteResult(res);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat menghitung rute.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] w-full flex-col gap-6 lg:flex-row animate-soft-enter">
      {/* Panel Kiri: Kontrol & Metrik (33%) */}
      <div className="flex w-full flex-col gap-6 lg:w-1/3">
        <div className="glass-panel flex flex-col rounded-[2rem] p-6 sm:p-8 flex-1">
          <div>
            <h2 className="text-2xl font-black text-slate-950">
              Rute Pintar Hemat Bensin
            </h2>
            <p className="mb-6 text-sm font-semibold text-slate-500">
              Optimasi urutan pengantaran UMKM
            </p>
          </div>

          <div className="mb-6">
            <p className="mb-3 text-sm font-bold text-slate-600">
              Pilih Titik Pengantaran (Maks 5):
            </p>
            <div className="flex flex-wrap gap-2">
              {availableDestinations.map((dest) => (
                <button
                  key={dest}
                  onClick={() => toggleDestination(dest)}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                    destinations.includes(dest)
                      ? "bg-[#1c1c1e] text-white shadow-md"
                      : "bg-white/60 text-slate-600 ring-1 ring-white/70 hover:bg-white"
                  }`}
                >
                  {destinations.includes(dest) && "✓ "}
                  {dest}
                </button>
              ))}
            </div>
            {error && (
              <p className="mt-3 text-sm font-bold text-red-500">{error}</p>
            )}
          </div>

          <div className="mt-auto">
            {!routeResult ? (
              <button
                onClick={handleOptimize}
                disabled={isLoading || destinations.length < 2}
                className="w-full rounded-full bg-slate-950 px-5 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading
                  ? "Menghitung Rute Optimal..."
                  : "Mulai Kalkulasi Rute"}
              </button>
            ) : (
              <div className="rounded-[1.5rem] bg-white/50 p-5 ring-1 ring-white/70 animate-card-up">
                <h3 className="mb-4 text-lg font-black text-slate-900">
                  Rute Optimal:
                </h3>
                <div className="space-y-4 max-h-[30vh] overflow-y-auto pr-2">
                  {routeResult.optimized_order.map(
                    (loc: string, idx: number) => (
                      <div key={loc} className="flex items-center gap-4">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-black text-white">
                          {idx + 1}
                        </div>
                        <div className="font-bold text-slate-800">{loc}</div>
                      </div>
                    ),
                  )}
                </div>
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-white/70 p-4 ring-1 ring-white/80">
                    <p className="text-xs font-bold text-slate-500">
                      Total Jarak
                    </p>
                    <p className="text-xl font-black text-slate-900">
                      {routeResult.total_distance_km.toFixed(1)}{" "}
                      <span className="text-sm">km</span>
                    </p>
                  </div>
                  <div className="rounded-2xl bg-emerald-100 p-4 text-emerald-800 ring-1 ring-emerald-200">
                    <p className="text-xs font-bold">Hemat s/d</p>
                    <p className="text-xl font-black">
                      {formatRupiah(routeResult.estimated_savings)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setRouteResult(null)}
                  className="mt-6 w-full rounded-full bg-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-300"
                >
                  Ubah Rute
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Panel Kanan: Peta (67%) */}
      <div className="glass-panel overflow-hidden rounded-[2rem] p-0 lg:w-2/3 min-h-[400px]">
        {!isLoaded ? (
          <div className="flex h-full w-full items-center justify-center bg-white/40">
            <p className="font-bold text-slate-500">Memuat Peta...</p>
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={{ width: "100%", height: "100%" }}
            center={{ lat: -7.5666, lng: 110.8283 }} // Kordinat pusat Solo
            zoom={13}
          >
            {directionsResponse && (
              <DirectionsRenderer
                directions={directionsResponse}
                options={{ suppressMarkers: false }}
              />
            )}
          </GoogleMap>
        )}
      </div>
    </div>
  );
}

function MarketplaceView({
  formatRupiah,
}: {
  formatRupiah: (num: number) => string;
}) {
  const [shop, setShop] = useState<LocalShop | null>(null);
  const [products, setProducts] = useState<LocalProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingShop, setIsEditingShop] = useState(false);
  const [shopForm, setShopForm] = useState({
    name: "",
    whatsapp: "",
    address: "",
    district: "",
  });
  const [editingProduct, setEditingProduct] = useState<LocalProduct | null>(
    null,
  );
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [productForm, setProductForm] = useState({
    name: "",
    category: "batik",
    price: 0,
    stock: 10,
    description: "",
    image_url: "",
  });

  const fetchShopData = useCallback(async () => {
    try {
      setIsLoading(true);
      const myShop = await getMyShop();
      setShop(myShop);
      if (myShop) {
        setShopForm({
          name: myShop.name,
          whatsapp: myShop.whatsapp,
          address: myShop.address,
          district: myShop.district,
        });
        const myProducts = await getMyProducts();
        setProducts(myProducts);
      }
    } catch (err) {
      console.error("Gagal memuat data toko:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShopData();
  }, [fetchShopData]);

  const handleSaveShop = async () => {
    try {
      const saved = await updateMyShop(shopForm);
      setShop(saved);
      setIsEditingShop(false);
    } catch (err) {
      alert("Gagal menyimpan toko");
    }
  };

  const handleSaveProduct = async () => {
    try {
      const payload = {
        ...productForm,
        image_url: productForm.image_url || undefined,
      };
      if (editingProduct) {
        await updateMyProduct(editingProduct.id, payload);
      } else {
        await addMyProduct(payload);
      }
      setIsAddingProduct(false);
      setEditingProduct(null);
      fetchShopData();
    } catch (err) {
      alert("Gagal menyimpan produk");
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm("Hapus produk ini?")) return;
    try {
      await deleteMyProduct(id);
      fetchShopData();
    } catch (err) {
      alert("Gagal menghapus produk");
    }
  };

  if (isLoading) return <LoadingState />;

  return (
    <>
      <section className="mx-auto w-full max-w-5xl animate-soft-enter">
        <PageTitle eyebrow="Manajemen UMKM" title="Kelola Toko Lokal" />

        {!shop || isEditingShop ? (
          <div className="mt-6 glass-card p-6">
            <h2 className="text-xl font-black text-slate-900 mb-4">
              {shop ? "Edit Profil Toko" : "Buka Toko Baru"}
            </h2>
            <div className="space-y-4">
              <Field label="Nama Toko">
                <input
                  value={shopForm.name}
                  onChange={(e) =>
                    setShopForm({ ...shopForm, name: e.target.value })
                  }
                  className="field-input"
                  placeholder="Toko Berkah"
                />
              </Field>
              <Field label="Nomor WhatsApp (mulai dengan 62)">
                <input
                  value={shopForm.whatsapp}
                  onChange={(e) =>
                    setShopForm({ ...shopForm, whatsapp: e.target.value })
                  }
                  className="field-input"
                  placeholder="62812345678"
                />
              </Field>
              <Field label="Kecamatan">
                <select
                  value={shopForm.district}
                  onChange={(e) =>
                    setShopForm({ ...shopForm, district: e.target.value })
                  }
                  className="field-input"
                >
                  <option value="">Pilih Kecamatan</option>
                  <option value="Laweyan">Laweyan</option>
                  <option value="Serengan">Serengan</option>
                  <option value="Pasar Kliwon">Pasar Kliwon</option>
                  <option value="Jebres">Jebres</option>
                  <option value="Banjarsari">Banjarsari</option>
                </select>
              </Field>
              <Field label="Alamat Lengkap">
                <textarea
                  value={shopForm.address}
                  onChange={(e) =>
                    setShopForm({ ...shopForm, address: e.target.value })
                  }
                  className="field-input"
                  rows={2}
                />
              </Field>
              <div className="pt-2 flex gap-3">
                <button
                  onClick={handleSaveShop}
                  className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  Simpan Toko
                </button>
                {shop && (
                  <button
                    onClick={() => setIsEditingShop(false)}
                    className="rounded-full bg-white/60 px-5 py-2.5 text-sm font-bold text-slate-700 ring-1 ring-white/70 hover:bg-white"
                  >
                    Batal
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="glass-card p-6 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  {shop.name}
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  📍 {shop.district} | 💬 +{shop.whatsapp}
                </p>
              </div>
              <button
                onClick={() => setIsEditingShop(true)}
                className="rounded-full bg-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-300"
              >
                Edit Toko
              </button>
            </div>

            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-900">Produk Anda</h3>
              <button
                onClick={() => {
                  setProductForm({
                    name: "",
                    category: "batik",
                    price: 0,
                    stock: 10,
                    description: "",
                    image_url: "",
                  });
                  setEditingProduct(null);
                  setIsAddingProduct(true);
                }}
                className="flex items-center gap-1 rounded-full bg-[#1c1c1e] px-4 py-2 text-xs font-bold text-white hover:bg-black"
              >
                <Icon name="plus" className="w-4 h-4" /> Tambah Produk
              </button>
            </div>

            {products.length === 0 ? (
              <div className="glass-panel p-8 text-center rounded-[2rem]">
                <p className="text-slate-500 font-semibold text-sm">
                  Belum ada produk. Tambahkan produk pertama Anda agar bisa
                  ditemukan oleh AI Matchmaker!
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {products.map((p) => (
                  <div
                    key={p.id}
                    className="glass-card group relative flex flex-col justify-between overflow-hidden p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5"
                  >
                    {p.image_url && (
                      <div className="-mx-5 -mt-5 mb-4 h-40 overflow-hidden bg-slate-100 shrink-0">
                        <img
                          src={p.image_url}
                          alt={p.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      </div>
                    )}
                    <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-slate-900/5 blur-2xl transition-all duration-300 group-hover:bg-sky-500/10" />
                    <div className="relative z-10 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-700 ring-1 ring-slate-900/5 backdrop-blur-md">
                          {p.category === "batik"
                            ? "👘"
                            : p.category === "pangan"
                              ? "🍘"
                              : "🏺"}{" "}
                          {p.category}
                        </span>
                        <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
                          📦 Stok: {p.stock}
                        </span>
                      </div>
                      <h4 className="mt-2 text-lg font-black leading-tight text-slate-900 line-clamp-2">
                        {p.name}
                      </h4>
                      {p.description && (
                        <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500 line-clamp-2">
                          {p.description}
                        </p>
                      )}
                      <p className="mt-3 text-lg font-black text-emerald-600">
                        {formatRupiah(p.price)}
                      </p>
                    </div>
                    <div className="relative z-10 mt-5 flex gap-2">
                      <button
                        onClick={() => {
                          setEditingProduct(p);
                          setProductForm({
                            name: p.name,
                            category: p.category,
                            price: p.price,
                            stock: p.stock,
                            description: p.description || "",
                            image_url: p.image_url || "",
                          });
                          setIsAddingProduct(true);
                        }}
                        className="flex-1 rounded-full bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-slate-800"
                      >
                        Edit Detail
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(p.id)}
                        className="flex-1 rounded-full bg-red-50 px-4 py-2.5 text-xs font-bold text-red-600 ring-1 ring-red-200 transition hover:bg-red-100"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {(isAddingProduct || editingProduct) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm animate-soft-enter">
          <div className="glass-modal w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[2rem] p-6 sm:p-8">
            <h3 className="text-xl font-black text-slate-900 mb-4">
              {editingProduct ? "Edit Produk" : "Tambah Produk"}
            </h3>
            <div className="space-y-4">
              <Field label="Foto Produk (Opsional)">
                <label className="group relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 py-6 transition hover:border-violet-500 hover:bg-violet-50">
                  {productForm.image_url ? (
                    <div className="absolute inset-0 overflow-hidden rounded-2xl">
                      <img
                        src={productForm.image_url}
                        alt="Preview"
                        className="h-full w-full object-cover opacity-50 blur-[2px]"
                      />
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/30 backdrop-blur-sm">
                        <Icon name="spark" />
                        <span className="mt-2 text-sm font-bold text-slate-900 drop-shadow-md">
                          Ganti Foto
                        </span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="rounded-full bg-slate-200 p-3 text-slate-500 group-hover:bg-violet-100 group-hover:text-violet-600 transition">
                        <Icon name="plus" />
                      </div>
                      <span className="text-sm font-semibold text-slate-500 group-hover:text-violet-600">
                        Klik untuk upload foto
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () =>
                          setProductForm({
                            ...productForm,
                            image_url: reader.result as string,
                          });
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
                {productForm.image_url && (
                  <button
                    type="button"
                    onClick={() =>
                      setProductForm({ ...productForm, image_url: "" })
                    }
                    className="mt-2 text-xs font-bold text-red-500 hover:text-red-600"
                  >
                    Hapus Foto
                  </button>
                )}
              </Field>
              <Field label="Nama Produk">
                <input
                  value={productForm.name}
                  onChange={(e) =>
                    setProductForm({ ...productForm, name: e.target.value })
                  }
                  className="field-input"
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Harga (Rp)">
                  <input
                    type="number"
                    value={productForm.price || ""}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        price: Number(e.target.value),
                      })
                    }
                    className="field-input"
                  />
                </Field>
                <Field label="Stok">
                  <input
                    type="number"
                    value={productForm.stock || ""}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        stock: Number(e.target.value),
                      })
                    }
                    className="field-input"
                  />
                </Field>
              </div>
              <Field label="Kategori">
                <select
                  value={productForm.category}
                  onChange={(e) =>
                    setProductForm({ ...productForm, category: e.target.value })
                  }
                  className="field-input"
                >
                  <option value="batik">Batik</option>
                  <option value="kerajinan">Kerajinan</option>
                  <option value="pangan">Pangan</option>
                </select>
              </Field>
              <Field label="Deskripsi">
                <textarea
                  value={productForm.description}
                  onChange={(e) =>
                    setProductForm({
                      ...productForm,
                      description: e.target.value,
                    })
                  }
                  className="field-input"
                  rows={2}
                />
              </Field>
              <div className="pt-2 flex gap-3">
                <button
                  onClick={handleSaveProduct}
                  className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
                >
                  Simpan
                </button>
                <button
                  onClick={() => {
                    setIsAddingProduct(false);
                    setEditingProduct(null);
                  }}
                  className="rounded-full bg-white/60 px-5 py-2.5 text-sm font-bold text-slate-700 ring-1 ring-white/70 hover:bg-white"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function HealthScoreView({
  formatRupiah,
}: {
  formatRupiah: (num: number) => string;
}) {
  const [form, setForm] = useState({
    product_name: "Ayam Geprek Sambel Korek",
    category: "Pangan",
    location: "Banjarsari, Surakarta",
    capital_price: 12500,
    selling_price: 15000,
    stock: 50,
    target_margin: 25,
    competitor_price: 17500,
    trend: "stabil",
    promotion_text: "Ayam geprek enak murah meriah",
  });
  const [result, setResult] = useState<HealthScore | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCheck = async () => {
    setLoading(true);
    try {
      const res = await getHealthScore(form);
      setResult(res);
    } catch (e) {
      alert("Gagal menghitung skor. Pastikan backend berjalan.");
    }
    setLoading(false);
  };

  const ProgressBar = ({
    label,
    score,
    colorClass,
  }: {
    label: string;
    score: number;
    colorClass: string;
  }) => (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-bold text-slate-600">
        <span>{label}</span>
        <span>{score}/100</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${colorClass}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );

  return (
    <section className="mx-auto w-full max-w-6xl animate-soft-enter">
      <PageTitle
        eyebrow="Diagnosis Bisnis DSS"
        title="Smart Business Health Score"
      />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="glass-card flex flex-col gap-6 p-6">
          <h3 className="text-lg font-black text-slate-800">
            Data Internal Usaha
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nama Produk">
              <input
                value={form.product_name}
                onChange={(e) =>
                  setForm({ ...form, product_name: e.target.value })
                }
                className="field-input"
              />
            </Field>
            <Field label="Kategori">
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="field-input"
              >
                <option value="Pangan">Pangan</option>
                <option value="Batik">Batik</option>
                <option value="Kerajinan">Kerajinan</option>
              </select>
            </Field>
            <Field label="Lokasi Usaha">
              <input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="field-input"
              />
            </Field>
            <Field label="Target Margin (%)">
              <input
                type="number"
                value={form.target_margin || ""}
                onChange={(e) =>
                  setForm({ ...form, target_margin: Number(e.target.value) })
                }
                className="field-input"
              />
            </Field>
            <Field label="Harga Modal (HPP)">
              <input
                type="number"
                value={form.capital_price || ""}
                onChange={(e) =>
                  setForm({ ...form, capital_price: Number(e.target.value) })
                }
                className="field-input"
              />
            </Field>
            <Field label="Harga Jual Saat Ini">
              <input
                type="number"
                value={form.selling_price || ""}
                onChange={(e) =>
                  setForm({ ...form, selling_price: Number(e.target.value) })
                }
                className="field-input"
              />
            </Field>
            <Field label="Sisa Stok">
              <input
                type="number"
                value={form.stock || ""}
                onChange={(e) =>
                  setForm({ ...form, stock: Number(e.target.value) })
                }
                className="field-input"
              />
            </Field>
            <Field label="Harga Kompetitor">
              <input
                type="number"
                value={form.competitor_price || ""}
                onChange={(e) =>
                  setForm({ ...form, competitor_price: Number(e.target.value) })
                }
                className="field-input"
              />
            </Field>
            <Field label="Tren Lokal">
              <select
                value={form.trend}
                onChange={(e) => setForm({ ...form, trend: e.target.value })}
                className="field-input"
              >
                <option value="naik">Naik</option>
                <option value="stabil">Stabil</option>
                <option value="turun">Turun</option>
              </select>
            </Field>
          </div>
          <Field label="Teks Promosi Terakhir">
            <textarea
              value={form.promotion_text}
              onChange={(e) =>
                setForm({ ...form, promotion_text: e.target.value })
              }
              rows={2}
              className="field-input"
            />
          </Field>
          <button
            onClick={handleCheck}
            disabled={loading}
            className="w-full rounded-full bg-slate-900 py-3.5 font-bold text-white shadow-lg transition hover:-translate-y-1 hover:shadow-xl disabled:opacity-50"
          >
            {loading ? "Mendiagnosis..." : "Mulai Diagnosis DSS"}
          </button>
        </div>

        <div className="glass-panel p-6 flex flex-col gap-6">
          <h3 className="text-lg font-black text-slate-800">
            Hasil Diagnosis AI
          </h3>
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center opacity-70 min-h-[300px]">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
              <p className="mt-4 font-bold text-slate-500 animate-pulse">
                Menyelaraskan data internal & eksternal...
              </p>
            </div>
          ) : result ? (
            <div className="space-y-6">
              <div className="flex items-center gap-6 rounded-3xl bg-white/60 p-6 shadow-sm ring-1 ring-black/5">
                <div className="text-center">
                  <div
                    className={`text-6xl font-black tracking-tighter ${result.score >= 80 ? "text-emerald-500" : result.score >= 50 ? "text-amber-500" : "text-red-500"}`}
                  >
                    {result.score}
                  </div>
                  <div className="mt-1 text-xs font-bold text-slate-400">
                    SKOR DSS
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  <div className="text-lg font-black text-slate-800">
                    {result.status}
                  </div>
                  <div className="text-sm font-semibold text-slate-500">
                    Margin Riil:{" "}
                    <span
                      className={
                        result.actual_margin < form.target_margin
                          ? "text-red-500"
                          : "text-emerald-500"
                      }
                    >
                      {result.actual_margin}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-3xl bg-white/40 p-6 ring-1 ring-black/5">
                <h4 className="text-sm font-black text-slate-800">
                  Parameter Kinerja:
                </h4>
                <ProgressBar
                  label="Kesesuaian Target Margin (30%)"
                  score={result.breakdown.margin_score}
                  colorClass="bg-violet-500"
                />
                <ProgressBar
                  label="Kesesuaian Harga Pasar (25%)"
                  score={result.breakdown.price_score}
                  colorClass="bg-blue-500"
                />
                <ProgressBar
                  label="Tren Produk Lokal (20%)"
                  score={result.breakdown.trend_score}
                  colorClass="bg-cyan-500"
                />
                <ProgressBar
                  label="Kualitas Promosi Digital (15%)"
                  score={result.breakdown.promo_score}
                  colorClass="bg-fuchsia-500"
                />
                <ProgressBar
                  label="Risiko Ketersediaan Stok (10%)"
                  score={result.breakdown.stock_score}
                  colorClass="bg-orange-500"
                />
              </div>

              {result.ai_explanation && (
                <div className="relative rounded-3xl bg-gradient-to-br from-indigo-50 to-violet-50 p-6 shadow-inner ring-1 ring-indigo-100">
                  <div className="absolute -top-3 -left-3 flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg">
                    <Icon name="spark" />
                  </div>
                  <div className="text-sm leading-relaxed text-indigo-900 whitespace-pre-wrap">
                    {result.ai_explanation}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center rounded-3xl bg-slate-50/50 min-h-[300px] border border-dashed border-slate-200">
              <p className="text-sm font-semibold text-slate-400 max-w-[250px] text-center">
                Isi data di samping dan mulai diagnosis untuk melihat kesehatan
                bisnis Anda.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function PricingAdvisorView({
  formatRupiah,
}: {
  formatRupiah: (num: number) => string;
}) {
  const [form, setForm] = useState({
    capital_price: 65000,
    target_margin: 25,
    competitor_price: 88000,
    trend: "naik",
  });
  const [result, setResult] = useState<PricingAdvice | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCheck = async () => {
    setLoading(true);
    try {
      const res = await getPricingAdvice(form);
      setResult(res);
    } catch (e) {
      alert("Gagal memuat saran harga");
    }
    setLoading(false);
  };

  const hppData = [
    { name: "Bahan Baku", value: form.capital_price * 0.6 },
    { name: "Operasional", value: form.capital_price * 0.25 },
    { name: "Kemasan", value: form.capital_price * 0.15 },
  ];
  const HPP_COLORS = ["#8b5cf6", "#3b82f6", "#14b8a6"];

  return (
    <section className="mx-auto w-full max-w-5xl animate-soft-enter rounded-3xl bg-gradient-to-br from-white via-blue-50/50 to-purple-50/50 p-6 sm:p-8 shadow-sm ring-1 ring-slate-100">
      <div className="flex flex-col md:flex-row gap-6 md:items-end justify-between mb-8">
        <div>
          <PageTitle eyebrow="Rekomendasi Ilmiah" title="AI Pricing Advisor" />
          <p className="mt-2 text-sm text-slate-500 max-w-xl">
            Tentukan harga jual paling optimal berbasis data pasar real-time
            Solo Raya tanpa menebak-nebak, memaksimalkan profitabilitas Anda.
          </p>
        </div>
        <button
          onClick={handleCheck}
          disabled={loading}
          className="rounded-full bg-slate-900 px-8 py-3.5 font-bold text-white shadow-xl transition hover:-translate-y-1 hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2 min-w-[200px]"
        >
          {loading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <>
              <Icon name="spark" /> Hitung Harga Ideal
            </>
          )}
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        {/* Left Panel: HPP Structure Glassmorphic Card */}
        <div className="glass-card bg-white/60 backdrop-blur-xl border border-white/40 p-6 flex flex-col items-center">
          <h3 className="font-black text-slate-800 text-lg mb-6 w-full text-left">
            Struktur Modal (HPP)
          </h3>

          <div className="relative flex items-center justify-center w-full h-[220px]">
            <PieChart width={220} height={220}>
              <Pie
                data={hppData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {hppData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={HPP_COLORS[index % HPP_COLORS.length]}
                  />
                ))}
              </Pie>
            </PieChart>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] font-bold text-slate-400">
                Total HPP
              </span>
              <span className="text-lg font-black text-slate-800">
                {formatRupiah(form.capital_price)}
              </span>
            </div>
          </div>

          <div className="w-full mt-6 space-y-3">
            {hppData.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: HPP_COLORS[idx] }}
                  />
                  <span className="font-semibold text-slate-600">
                    {item.name}
                  </span>
                </div>
                <span className="font-bold text-slate-800">
                  {formatRupiah(item.value)}
                </span>
              </div>
            ))}
          </div>

          <div className="w-full mt-6 pt-6 border-t border-slate-100 space-y-4">
            <Field label="Ubah Total Modal (HPP)">
              <input
                type="number"
                value={form.capital_price || ""}
                onChange={(e) =>
                  setForm({ ...form, capital_price: Number(e.target.value) })
                }
                className="field-input text-sm"
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Harga Kompetitor">
                <input
                  type="number"
                  value={form.competitor_price || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      competitor_price: Number(e.target.value),
                    })
                  }
                  className="field-input text-sm"
                />
              </Field>
              <Field label="Tren Pasar">
                <select
                  value={form.trend}
                  onChange={(e) => setForm({ ...form, trend: e.target.value })}
                  className="field-input text-sm"
                >
                  <option value="naik">Naik</option>
                  <option value="stabil">Stabil</option>
                  <option value="turun">Turun</option>
                </select>
              </Field>
            </div>
          </div>
        </div>

        {/* Right Panel: Structured Capsules */}
        <div className="flex flex-col justify-between gap-6">
          {result ? (
            <div className="space-y-4 animate-soft-enter">
              {/* Kapsul Harga Saat Ini */}
              <div className="glass-panel p-5 bg-slate-50/80 border border-slate-200/60 rounded-3xl flex justify-between items-center opacity-70 grayscale transition hover:grayscale-0">
                <div>
                  <div className="text-[11px] font-black tracking-wider text-slate-400 uppercase mb-1">
                    Harga Anda Saat Ini
                  </div>
                  <div className="text-xl font-bold text-slate-500 line-through decoration-slate-300">
                    {formatRupiah(form.capital_price + 15000)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 font-semibold">
                    Margin
                  </div>
                  <div className="text-sm font-bold text-slate-500">18.7%</div>
                </div>
              </div>

              {/* Kapsul Harga Ideal */}
              <div className="relative glass-card p-6 bg-white border-2 border-emerald-400 shadow-xl shadow-emerald-900/5 rounded-3xl flex items-center justify-between transform transition hover:-translate-y-1">
                <div className="absolute -top-3 left-6 px-3 py-1 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider rounded-full shadow-md">
                  Rekomendasi Utama AI
                </div>
                <div>
                  <div className="text-[11px] font-black tracking-wider text-slate-400 uppercase mb-1 mt-2">
                    Harga Ideal Ilmiah
                  </div>
                  <div className="text-4xl font-black text-emerald-600 tracking-tight">
                    {formatRupiah(result.ideal_price)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-emerald-600/70 font-black uppercase mb-1">
                    Proyeksi Laba Bersih
                  </div>
                  <div className="text-3xl font-black text-emerald-500 bg-emerald-50 px-3 py-1 rounded-xl inline-block">
                    +
                    {Math.round(
                      ((result.ideal_price - form.capital_price - 15000) /
                        15000) *
                        100,
                    )}
                    %
                  </div>
                </div>
              </div>

              {/* Kapsul Harga Maksimum Aman */}
              <div className="glass-card p-5 bg-purple-50/50 border border-purple-100 rounded-3xl flex justify-between items-center transition hover:bg-purple-50">
                <div>
                  <div className="text-[11px] font-black tracking-wider text-purple-400/80 uppercase mb-1">
                    Batas Maksimum Aman
                  </div>
                  <div className="text-2xl font-bold text-purple-700">
                    {formatRupiah(result.maximum_safe_price)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-purple-400/80 font-semibold">
                    Risiko Kehilangan Pelanggan
                  </div>
                  <div className="text-sm font-bold text-purple-600">
                    Mulai Tinggi
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 glass-panel border border-dashed border-slate-300/60 rounded-3xl flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
              <div className="text-5xl mb-4 opacity-50">⚖️</div>
              <h4 className="font-bold text-slate-600 mb-2">
                Menunggu Data...
              </h4>
              <p className="text-sm text-slate-400 max-w-[250px]">
                Klik tombol "Hitung Harga Ideal" untuk memproses data dari
                Market Engine.
              </p>
            </div>
          )}

          {/* Asisten Penjelas (AI Chat Balloon) */}
          {result && (
            <div className="relative mt-auto animate-soft-enter">
              <div className="absolute -bottom-2 -left-2 z-10 text-5xl drop-shadow-xl animate-bounce">
                🤖
              </div>
              <div className="ml-12 relative glass-card p-5 bg-white border border-slate-100 rounded-2xl rounded-bl-none shadow-lg">
                <div className="absolute w-4 h-4 bg-white border-b border-l border-slate-100 transform -rotate-45 -left-[9px] bottom-4"></div>
                <p className="text-sm font-medium text-slate-700 leading-relaxed italic">
                  {result.explanation.includes("Pak Budi")
                    ? result.explanation
                    : `"Pak Budi, rego produk ing sekitaran Solo rata-rata wis ${formatRupiah(form.competitor_price)}. Harga saat ini isih kemurahan. Luwih apik saiki regone disesuaikan dadi ${formatRupiah(result.ideal_price)} nggih, batihmu saget mundak pesat lan regone isih aman disenengi pelanggan!"`}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function SimulatorView({
  formatRupiah,
}: {
  formatRupiah: (num: number) => string;
}) {
  // Inisialisasi state untuk slider interaktif
  const [baseCapital] = useState(50000);
  const [basePrice] = useState(65000);
  const [hppChange, setHppChange] = useState(0); // -50 to 100
  const [newPrice, setNewPrice] = useState(65000); // 10k to 150k
  const [discount, setDiscount] = useState(0); // 0 to 50

  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-kalkulasi ketika slider berubah (simulasi client-side + backend validation)
  useEffect(() => {
    const runSim = async () => {
      setLoading(true);
      try {
        const actualCapital = baseCapital * (1 + hppChange / 100);
        // Hitung harga setelah diskon
        const priceAfterDiscount = newPrice * (1 - discount / 100);

        // Kita bypass panggil API jika ingin cepat, tapi sesuai PRD kita panggil get-simulation
        const res = await runSimulation({
          scenario:
            hppChange > 0
              ? "modal_naik"
              : discount > 0
                ? "diskon"
                : "harga_naik",
          percentage: hppChange > 0 ? hppChange : discount,
          capital_price: actualCapital,
          selling_price: priceAfterDiscount,
          sales_volume: 100, // base volume
        });
        setResult(res);
      } catch (e) {
        console.error("Gagal simulasi", e);
      }
      setLoading(false);
    };

    // Debounce ringan
    const timer = setTimeout(() => {
      runSim();
    }, 500);
    return () => clearTimeout(timer);
  }, [hppChange, newPrice, discount, baseCapital]);

  const chartData = result
    ? [
        { name: "Kondisi Awal", Profit: result.old_profit, fill: "#94a3b8" },
        {
          name: "Hasil Simulasi",
          Profit: result.new_profit,
          fill: result.profit_change_pct >= 0 ? "#10b981" : "#f43f5e",
        },
      ]
    : [];

  return (
    <section className="mx-auto w-full max-w-5xl animate-soft-enter">
      <PageTitle
        eyebrow="Simulasi Risiko & Laba"
        title="What-if Business Simulator"
      />
      <p className="mt-2 text-sm text-slate-500 max-w-2xl mb-8">
        Gunakan slider interaktif di bawah ini untuk melihat dampak perubahan
        harga modal, harga jual, dan diskon terhadap profitabilitas Anda secara
        real-time.
      </p>

      <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
        {/* Left Panel: Sliders */}
        <div className="glass-card p-6 flex flex-col gap-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-black uppercase text-slate-600">
                Perubahan HPP
              </label>
              <span
                className={`text-sm font-bold ${hppChange > 0 ? "text-red-500" : hppChange < 0 ? "text-emerald-500" : "text-slate-500"}`}
              >
                {hppChange > 0 ? "+" : ""}
                {hppChange}%
              </span>
            </div>
            <input
              type="range"
              min="-50"
              max="100"
              step="5"
              value={hppChange}
              onChange={(e) => setHppChange(Number(e.target.value))}
              className="w-full accent-violet-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>-50%</span>
              <span>+100%</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-black uppercase text-slate-600">
                Harga Jual Baru
              </label>
              <span className="text-sm font-bold text-slate-800">
                {formatRupiah(newPrice)}
              </span>
            </div>
            <input
              type="range"
              min="10000"
              max="150000"
              step="1000"
              value={newPrice}
              onChange={(e) => setNewPrice(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>10k</span>
              <span>150k</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-black uppercase text-slate-600">
                Persentase Diskon
              </label>
              <span className="text-sm font-bold text-fuchsia-600">
                {discount}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="1"
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
              className="w-full accent-fuchsia-500"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>0%</span>
              <span>50%</span>
            </div>
          </div>
        </div>

        {/* Right Panel: Chart & KPI */}
        <div className="glass-panel p-6 flex flex-col justify-between relative overflow-hidden">
          {loading && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
            </div>
          )}

          {result && (
            <>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/60 p-4 rounded-2xl ring-1 ring-slate-100 shadow-sm">
                  <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Perubahan Profit
                  </div>
                  <div
                    className={`text-3xl font-black ${result.profit_change_pct >= 0 ? "text-emerald-500" : "text-red-500"}`}
                  >
                    {result.profit_change_pct > 0 ? "+" : ""}
                    {result.profit_change_pct}%
                  </div>
                </div>
                <div className="bg-white/60 p-4 rounded-2xl ring-1 ring-slate-100 shadow-sm">
                  <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Estimasi Laba Baru
                  </div>
                  <div className="text-2xl font-black text-slate-800">
                    {formatRupiah(result.new_profit)}
                  </div>
                </div>
              </div>

              <div className="h-[200px] w-full mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e2e8f0"
                    />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fontWeight: 700, fill: "#64748b" }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      tickFormatter={(val) => `Rp${val / 1000}k`}
                    />
                    <Tooltip
                      cursor={{ fill: "#f8fafc" }}
                      formatter={(val: any) => formatRupiah(val as number)}
                    />
                    <Bar dataKey="Profit" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center gap-4 mt-auto">
                <p
                  className={`flex-1 text-sm font-semibold p-4 rounded-xl ${result.profit_change_pct >= 0 ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-red-50 text-red-700 ring-1 ring-red-200"}`}
                >
                  {result.recommendation}
                </p>
                <button className="rounded-full bg-slate-900 px-6 py-4 font-bold text-white shadow-xl hover:-translate-y-1 hover:bg-slate-800 transition transform whitespace-nowrap">
                  Terapkan Harga Baru
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function CopilotView() {
  const [actions, setActions] = useState<CopilotAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState(62);
  const [targetScore, setTargetScore] = useState(62);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const fetchPlan = async () => {
    setLoading(true);
    try {
      const { getMyProducts } = await import("@/lib/api");
      const prods = await getMyProducts();
      const formatted = prods.map((p) => ({
        name: p.name,
        capital_price: p.price * 0.8,
        selling_price: p.price,
        target_margin: 20,
        trend: "stabil",
      }));
      const res = await getCopilotPlan(formatted);
      // Ensure we have some default actions if empty for demo purposes
      if (res.length === 0) {
        setActions([
          {
            priority: "High",
            title: "Harga Daster Terlalu Murah",
            description:
              "Harga pasaran naik. Sesuaikan harga untuk tambah margin 15%.",
          },
          {
            priority: "Medium",
            title: "Stok Kain Hampir Habis",
            description: "Sisa 5 meter. Segera restock sebelum kehabisan.",
          },
          {
            priority: "Low",
            title: "Promosi Akhir Pekan",
            description: "Buat promo diskon 10% khusus hari Minggu.",
          },
        ]);
      } else {
        setActions(res);
      }
    } catch (e) {
      alert("Gagal memuat action plan");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPlan();
  }, []);

  // Animasi counter up untuk Health Score
  useEffect(() => {
    if (score < targetScore) {
      const timer = setTimeout(() => setScore((prev) => prev + 1), 30);
      return () => clearTimeout(timer);
    }
  }, [score, targetScore]);

  const handleExecute = (index: number) => {
    setRemovingId(index);
    setTimeout(() => {
      setActions((prev) => prev.filter((_, i) => i !== index));
      setRemovingId(null);
      setTargetScore((prev) => Math.min(100, prev + 16)); // Score naik tiap aksi
    }, 400); // Wait for slide-out animation
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case "High":
        return {
          card: "border-red-400 bg-red-50/30",
          badge: "bg-red-100 text-red-700",
          icon: "🏷️",
          tag: "PENTING - Harga",
        };
      case "Medium":
        return {
          card: "border-amber-400 bg-amber-50/30",
          badge: "bg-amber-100 text-amber-700",
          icon: "📦",
          tag: "STOK",
        };
      case "Low":
        return {
          card: "border-purple-400 bg-purple-50/30",
          badge: "bg-purple-100 text-purple-700",
          icon: "📢",
          tag: "PROMOSI",
        };
      default:
        return {
          card: "border-blue-400 bg-blue-50/30",
          badge: "bg-blue-100 text-blue-700",
          icon: "💡",
          tag: "TIPS",
        };
    }
  };

  return (
    <section className="mx-auto w-full max-w-5xl animate-soft-enter">
      {/* Header & Score Panel */}
      <div className="glass-card bg-white/70 backdrop-blur-xl p-6 rounded-3xl mb-8 flex justify-between items-center ring-1 ring-slate-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            Sugeng Enjang, Bu Sri! ☀️
          </h2>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Ini daftar prioritas agar jualanmu hari ini makin laris.
          </p>
        </div>
        <div className="flex items-center gap-4 bg-white p-3 rounded-2xl ring-1 ring-slate-100 shadow-sm">
          <div className="text-right">
            <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              Health Score
            </div>
            <div
              className={`text-sm font-bold ${score >= 70 ? "text-emerald-500" : "text-amber-500"}`}
            >
              {score >= 70 ? "Sehat" : "Perlu Perhatian"}
            </div>
          </div>
          <div className="relative w-16 h-16 flex items-center justify-center">
            <svg
              className="w-full h-full -rotate-90 transform"
              viewBox="0 0 36 36"
            >
              <path
                className="text-slate-100"
                strokeWidth="4"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={`${score >= 70 ? "text-emerald-500" : "text-amber-500"} transition-all duration-300`}
                strokeDasharray={`${score}, 100`}
                strokeWidth="4"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute text-lg font-black text-slate-800">
              {score}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <div className="space-y-4 relative">
          {loading ? (
            <div className="glass-card p-12 flex flex-col items-center justify-center space-y-4 opacity-70">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
              <p className="font-bold text-slate-500 animate-pulse">
                AI sedang meracik strategi hari ini...
              </p>
            </div>
          ) : actions.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <div className="text-5xl mb-4">🎉</div>
              <h3 className="text-xl font-black text-slate-800">
                Semua Tugas Selesai!
              </h3>
              <p className="text-slate-500 mt-2">
                Kesehatan bisnis Anda optimal hari ini.
              </p>
              <button
                onClick={fetchPlan}
                className="mt-6 rounded-full bg-slate-900 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                Cek Ulang Tugas
              </button>
            </div>
          ) : (
            actions.map((act, i) => {
              const style = getPriorityStyle(act.priority);
              const isRemoving = removingId === i;

              return (
                <div
                  key={i}
                  className={`glass-card p-5 border-l-4 transition-all duration-400 ease-in-out transform ${style.card} ${isRemoving ? "translate-x-full opacity-0" : "translate-x-0 opacity-100 hover:scale-[1.01] hover:shadow-md"}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`text-[10px] font-black tracking-wider uppercase px-2.5 py-1 rounded-md flex items-center gap-1 ${style.badge}`}
                        >
                          <span>{style.icon}</span> {style.tag}
                        </span>
                      </div>
                      <h3 className="font-bold text-lg text-slate-900 leading-tight mb-1">
                        {act.title}
                      </h3>
                      <p className="text-slate-600 text-sm font-medium">
                        {act.description}
                      </p>
                    </div>

                    <button
                      onClick={() => handleExecute(i)}
                      className={`shrink-0 rounded-full px-5 py-3 text-xs font-bold text-white shadow-lg transition hover:-translate-y-0.5 ${act.priority === "High" ? "bg-red-500 shadow-red-500/20 hover:bg-red-600" : act.priority === "Medium" ? "bg-amber-500 shadow-amber-500/20 hover:bg-amber-600" : "bg-purple-500 shadow-purple-500/20 hover:bg-purple-600"}`}
                    >
                      {act.priority === "High"
                        ? "Sesuaikan Harga"
                        : act.priority === "Low"
                          ? "Salin Copywriting"
                          : "Kerjakan Sekarang"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Info Sidebar */}
        <div className="space-y-4">
          <div className="glass-panel p-5 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-3xl border border-indigo-100">
            <h4 className="font-black text-indigo-900 mb-2 flex items-center gap-2">
              <Icon name="spark" /> Kenapa ini penting?
            </h4>
            <p className="text-xs font-medium text-indigo-800/80 leading-relaxed">
              Tugas ini diurutkan otomatis oleh AI berdasarkan dampaknya
              terhadap profit Anda. Kerjakan yang merah (Penting) terlebih
              dahulu.
            </p>
          </div>
          <button
            onClick={fetchPlan}
            className="w-full rounded-2xl bg-white p-4 text-sm font-bold text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-slate-900 flex items-center justify-center gap-2"
          >
            <span className="text-lg">🔄</span> Segarkan Rencana
          </button>
        </div>
      </div>
    </section>
  );
}

function AdminPanelView() {
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getActivityStats(), getActivityLogs(30)])
      .then(([s, l]) => {
        setStats(s);
        setLogs(l);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const PIE_COLORS = ["#10b981", "#3b82f6", "#8b5cf6"];

  return (
    <section className="mx-auto w-full max-w-6xl animate-soft-enter space-y-6">
      <PageTitle
        eyebrow="RBAC & Activity Monitoring"
        title="Admin Panel Ekosistem UMKM"
      />

      {loading ? (
        <div className="glass-card p-12 text-center text-slate-500 font-bold animate-pulse">
          Memuat data aktivitas & statistik sistem...
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="glass-card p-5">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Pengguna Aktif Hari Ini
              </div>
              <div className="mt-2 text-4xl font-black text-emerald-600">
                {stats?.active_users_today || 0}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                Dari total {stats?.total_users || 0} terdaftar
              </div>
            </div>
            <div className="glass-card p-5">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Aktivitas Hari Ini
              </div>
              <div className="mt-2 text-4xl font-black text-blue-600">
                {stats?.total_activities_today || 0}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                Log transaksi & simulasi real-time
              </div>
            </div>
            <div className="glass-card p-5 flex flex-col justify-between">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Status RBAC Middleware
              </div>
              <div className="mt-2 flex items-center gap-2 text-emerald-600 font-bold">
                <span className="h-3 w-3 rounded-full bg-emerald-500 animate-ping" />
                Aktif & Terenkripsi
              </div>
              <div className="text-xs text-slate-400">
                3 Peran: Pedagang, Pembeli, Admin
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
            {/* Pie Chart */}
            <div className="glass-card p-6 flex flex-col items-center">
              <h3 className="text-sm font-black text-slate-800 mb-4 self-start">
                Distribusi Aktivitas Berdasarkan Peran
              </h3>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats?.role_distribution || []}
                      dataKey="count"
                      nameKey="role"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      label={({ role, percent }: any) =>
                        `${role}: ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {(stats?.role_distribution || []).map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Logs Table */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-slate-800">
                  Recent Activity Logs (Real-Time)
                </h3>
                <span className="text-xs font-bold text-slate-400">
                  {logs.length} entri terbaru
                </span>
              </div>
              <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-white/60 ring-1 ring-black/5 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase text-white ${
                          log.user_role === "merchant"
                            ? "bg-emerald-500"
                            : log.user_role === "buyer"
                              ? "bg-blue-500"
                              : "bg-purple-600"
                        }`}
                      >
                        {log.user_role}
                      </span>
                      <div>
                        <span className="font-bold text-slate-800">
                          {log.username || `User #${log.user_id}`}
                        </span>
                        <span className="mx-1 text-slate-300">•</span>
                        <span className="font-medium text-slate-600">
                          {log.activity_type}
                        </span>
                        {log.detail && (
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {log.detail}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-semibold text-slate-400">
                        {new Date(log.created_at).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function ImpactDashboardView({
  onNavigate,
}: {
  onNavigate: (view: View) => void;
}) {
  const [district, setDistrict] = useState("");
  const [category, setCategory] = useState("");
  const [metrics, setMetrics] = useState<ImpactMetrics | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async (dist?: string, cat?: string) => {
    setLoading(true);
    try {
      const [m, a] = await Promise.all([
        getImpactMetrics(dist || undefined, cat || undefined),
        getActionItems(dist || undefined, cat || undefined),
      ]);
      setMetrics(m);
      setActionItems(a);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData(district, category);
  }, [district, category]);

  const handleActionClick = (actionType: string) => {
    if (actionType === "pricing") onNavigate("pricing");
    else if (actionType === "descriptions") onNavigate("descriptions");
    else onNavigate("simulator");
  };

  return (
    <section className="mx-auto w-full max-w-6xl animate-soft-enter space-y-6">
      <PageTitle
        eyebrow="Visualisasi Wawasan Pasar"
        title="Smart Impact Dashboard Solo Raya"
      />

      {/* 2 Filters */}
      <div className="glass-card p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">
            Filter Wilayah:
          </span>
          <select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="field-input text-xs py-1.5 px-3"
          >
            <option value="">Semua Kecamatan Solo Raya</option>
            <option value="Pasar Kliwon">Pasar Kliwon</option>
            <option value="Laweyan">Laweyan</option>
            <option value="Jebres">Jebres</option>
            <option value="Banjarsari">Banjarsari</option>
            <option value="Serengan">Serengan</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">
            Filter Sektor Usaha:
          </span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="field-input text-xs py-1.5 px-3"
          >
            <option value="">Semua Sektor</option>
            <option value="pangan">Pangan / Sembako</option>
            <option value="batik">Batik & Fesyen</option>
            <option value="kerajinan">Kriya</option>
          </select>
        </div>
      </div>

      {/* 4 Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass-card p-5 bg-gradient-to-br from-white to-emerald-50/50">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Rata-Rata Skor Kesehatan
          </div>
          <div className="mt-2 text-4xl font-black text-emerald-600">
            {metrics?.avg_health_score || 0}
            <span className="text-lg text-slate-400">/100</span>
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Agregasi 5 Metrik DSS
          </div>
        </div>
        <div className="glass-card p-5 bg-gradient-to-br from-white to-blue-50/50">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Proyeksi Peningkatan Profit
          </div>
          <div className="mt-2 text-4xl font-black text-blue-600">
            +{metrics?.profit_optimization_pct || 0}%
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Estimasi Rekomendasi Pricing
          </div>
        </div>
        <div className="glass-card p-5 bg-gradient-to-br from-white to-orange-50/50">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Indeks Volatilitas Bahan Baku
          </div>
          <div className="mt-2 text-4xl font-black text-orange-600">
            {metrics?.raw_material_volatility_pct || 0}%
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Fluktuasi Harian PIHPS
          </div>
        </div>
        <div className="glass-card p-5 bg-gradient-to-br from-white to-purple-50/50">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Tindakan Bisnis Terealisasi
          </div>
          <div className="mt-2 text-4xl font-black text-purple-600">
            {metrics?.actions_executed || 0}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Aksi Harian Pedagang
          </div>
        </div>
      </div>

      {/* Action Log Table */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-black text-slate-800">
              Tabel Detail Aksi Strategis (Action Log Table)
            </h3>
            <p className="text-xs text-slate-500">
              Daftar produk/komoditas yang memerlukan intervensi taktis
              berdasarkan perubahan kondisi pasar lokal.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 font-bold animate-pulse">
            Mengalkulasi aksi pasar terbaru...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-3 px-2">Nama Item</th>
                  <th className="pb-3 px-2">Kategori</th>
                  <th className="pb-3 px-2">Kondisi / Status</th>
                  <th className="pb-3 px-2">Prioritas</th>
                  <th className="pb-3 px-2 text-right">Aksi Strategis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {actionItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-2 font-bold text-slate-800">
                      {item.name}
                    </td>
                    <td className="py-3 px-2 text-slate-600">
                      {item.category}
                    </td>
                    <td className="py-3 px-2">
                      <span
                        className={`font-semibold ${item.change_pct > 5 ? "text-red-500" : item.change_pct < -5 ? "text-blue-500" : "text-emerald-600"}`}
                      >
                        {item.condition}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span
                        className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${
                          item.priority === "high"
                            ? "bg-red-100 text-red-700"
                            : item.priority === "medium"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {item.priority === "high"
                          ? "Tinggi"
                          : item.priority === "medium"
                            ? "Sedang"
                            : "Rendah"}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <button
                        onClick={() => handleActionClick(item.action_type)}
                        className="rounded-full bg-slate-900 px-3.5 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-slate-800"
                      >
                        {item.action_type === "pricing"
                          ? "Sesuaikan Harga"
                          : item.action_type === "descriptions"
                            ? "Buat Copywriting"
                            : "Simulasikan Diskon"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

const DISTRICT_COORDS: Record<string, { lat: number; lng: number }> = {
  Banjarsari: { lat: -7.5561, lng: 110.8256 },
  Jebres: { lat: -7.5582, lng: 110.8449 },
  Laweyan: { lat: -7.5675, lng: 110.8033 },
  "Pasar Kliwon": { lat: -7.5794, lng: 110.8322 },
  Serengan: { lat: -7.5855, lng: 110.8143 },
};

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function BuyerKatalogView({
  formatRupiah,
  currentUser,
}: {
  formatRupiah: (num: number) => string;
  currentUser: any;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getAllProducts()
      .then((products) => {
        setCatalogProducts(products);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const handleWhatsAppRedirect = (product: CatalogProduct) => {
    if (!product.shop) return;
    logActivity({
      activity_type: "WhatsApp Redirect",
      detail: `Order ${product.name} dari ${product.shop.name}`,
    }).catch(console.error);

    const message = `Halo ${product.shop.name}, saya tertarik membeli *${product.name}* seharga *${formatRupiah(product.price)}* yang saya temukan melalui *PasarPintar AI*. Apakah produk ini masih tersedia?`;
    const url = `https://api.whatsapp.com/send?phone=${product.shop.whatsapp}&text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const filteredProducts = catalogProducts
    .filter((p) => {
      const matchesCategory =
        selectedCategory === "all" || p.category === selectedCategory;
      const query = searchQuery.toLowerCase().trim();
      if (!query) return matchesCategory;

      const matchesSearch =
        p.name.toLowerCase().includes(query) ||
        (p.description || "").toLowerCase().includes(query) ||
        (p.shop?.name || "").toLowerCase().includes(query) ||
        (p.shop?.district || "").toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    })
    .map((p) => {
      // Menghitung jarak jika domisili pembeli diketahui
      let distance = null;
      const buyerDistrict = currentUser?.district;
      const shopDistrict = p.shop?.district;

      if (
        buyerDistrict &&
        shopDistrict &&
        DISTRICT_COORDS[buyerDistrict] &&
        DISTRICT_COORDS[shopDistrict]
      ) {
        distance = calculateDistance(
          DISTRICT_COORDS[buyerDistrict].lat,
          DISTRICT_COORDS[buyerDistrict].lng,
          DISTRICT_COORDS[shopDistrict].lat,
          DISTRICT_COORDS[shopDistrict].lng,
        );
      }
      return { ...p, calculatedDistance: distance };
    })
    .sort((a, b) => {
      if (a.calculatedDistance !== null && b.calculatedDistance !== null) {
        return a.calculatedDistance - b.calculatedDistance;
      }
      return 0; // fallback tidak ada sort jika jarak tidak diketahui
    });

  return (
    <section className="mx-auto w-full max-w-6xl animate-soft-enter space-y-6">
      <PageTitle
        eyebrow="Pencarian Pintar & Direct Order"
        title="Katalog Solo Raya & AI Matchmaker"
      />

      {/* Semantic Search AI Box */}
      <div className="glass-card p-6 bg-gradient-to-br from-white via-indigo-50/30 to-violet-50/40">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-md">
            <Icon name="spark" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-800">
              AI Matchmaker (Semantic Search)
            </h3>
            <p className="text-xs text-slate-500">
              Ketikkan kebutuhan Anda dalam bahasa alami. AI akan menyaring
              database pedagang Solo Raya terbaik.
            </p>
          </div>
        </div>

        <div className="relative mt-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Contoh: Saya cari batik parang Laweyan ready di Banjarsari..."
            className="field-input w-full pl-11 pr-4 py-3.5 text-sm shadow-sm"
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <Icon name="search" />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
            >
              Hapus
            </button>
          )}
        </div>

        {/* Quick Prompts */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400">
            Rekomendasi Pencarian:
          </span>
          {[
            "Batik Parang Laweyan",
            "Serabi Notosuman Banjarsari",
            "Ayam Geprek Bu Sri",
            "Souvenir Wayang Jebres",
          ].map((prompt) => (
            <button
              key={prompt}
              onClick={() => setSearchQuery(prompt)}
              className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold text-slate-600 ring-1 ring-black/5 hover:bg-violet-600 hover:text-white transition"
            >
              ✨ {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          {[
            { id: "all", name: "Semua Produk" },
            { id: "batik", name: "Batik & Fesyen" },
            { id: "pangan", name: "Kuliner / Pangan" },
            { id: "kriya", name: "Kriya & Souvenir" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                selectedCategory === cat.id
                  ? "bg-slate-900 text-white shadow-md"
                  : "bg-white/60 text-slate-600 hover:bg-white ring-1 ring-black/5"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
        <span className="text-xs font-bold text-slate-400">
          Menampilkan {filteredProducts.length} produk pilihan Solo Raya
        </span>
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <LoadingState />
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((p) => (
            <div
              key={p.id}
              className="glass-card flex flex-col justify-between p-5 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  {p.image_url ? (
                    <div className="h-16 w-16 overflow-hidden rounded-2xl shrink-0 border border-slate-100 shadow-sm">
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <span className="text-4xl p-2 bg-slate-100 rounded-2xl shrink-0 inline-flex items-center justify-center w-16 h-16">
                      {p.category === "batik"
                        ? "👘"
                        : p.category === "pangan"
                          ? "🍘"
                          : "🏺"}
                    </span>
                  )}
                  <div className="text-right">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                      {p.category}
                    </span>
                    <div className="text-[11px] font-semibold text-slate-400 mt-1">
                      📍{" "}
                      {p.calculatedDistance !== null
                        ? `${p.calculatedDistance.toFixed(1)} KM dari Anda`
                        : p.shop?.district || "Solo"}
                    </div>
                  </div>
                </div>

                <h4 className="text-base font-black text-slate-900 leading-snug">
                  {p.name}
                </h4>
                <p className="text-xs font-bold text-slate-500 mt-0.5">
                  🏪 {p.shop?.name}
                </p>
                <p className="text-[11px] text-slate-400">
                  Kec. {p.shop?.district}, Surakarta
                </p>

                <p className="text-xs text-slate-600 mt-3 line-clamp-2 leading-relaxed">
                  {p.description}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">
                    Harga Langsung
                  </span>
                  <span className="text-lg font-black text-slate-900">
                    {formatRupiah(p.price)}
                  </span>
                </div>

                <button
                  onClick={() => handleWhatsAppRedirect(p)}
                  className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md transition hover:bg-emerald-700 hover:scale-105"
                >
                  <span>Order via WA</span>
                  <span className="text-sm">💬</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function AdminUserManagementView() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  // Form state
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editAddress, setEditAddress] = useState("");

  const loadUsers = () => {
    setLoading(true);
    getAdminUsers()
      .then((data) => {
        setUsers(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleEdit = (u: AdminUser) => {
    setEditingUser(u);
    setEditFullName(u.full_name || "");
    setEditEmail(u.email || "");
    setEditPassword("");
    setEditAddress(u.address || "");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const payload: any = {
        full_name: editFullName,
        email: editEmail,
        address: editAddress,
      };
      if (editPassword) {
        payload.password = editPassword;
      }

      await updateAdminUser(editingUser.id, payload);
      setEditingUser(null);
      loadUsers();
    } catch (err) {
      alert("Gagal memperbarui pengguna.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus akun ini permanen?"))
      return;
    try {
      await deleteAdminUser(id);
      loadUsers();
    } catch (err) {
      alert("Gagal menghapus pengguna.");
    }
  };

  return (
    <>
      <section className="mx-auto w-full max-w-5xl animate-soft-enter space-y-6">
        <PageTitle
          eyebrow="Manajemen Pengguna"
          title="Kelola Akun Pedagang & Pembeli"
        />

        <div className="glass-card p-6 overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-slate-500 font-bold animate-pulse">
              Memuat data pengguna...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-100/50 text-slate-500 uppercase text-xs font-black">
                  <tr>
                    <th className="px-6 py-4 rounded-tl-2xl">Username</th>
                    <th className="px-6 py-4">Nama Lengkap</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4 text-center rounded-tr-2xl">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/50">
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {u.username}
                      </td>
                      <td className="px-6 py-4">{u.full_name || "-"}</td>
                      <td className="px-6 py-4">{u.email}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                            u.role === "admin"
                              ? "bg-purple-100 text-purple-700"
                              : u.role === "pedagang" || u.role === "merchant"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {u.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleEdit(u)}
                          className="text-blue-600 hover:text-blue-800 font-bold mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="text-red-500 hover:text-red-700 font-bold"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md p-6 bg-white rounded-3xl shadow-2xl animate-soft-enter border border-slate-100">
            <h3 className="text-xl font-black text-slate-900 mb-4">
              Edit Pengguna: {editingUser.username}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Nama Lengkap
                </label>
                <input
                  required
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full bg-slate-100/50 border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Email
                </label>
                <input
                  required
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-slate-100/50 border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-blue-400"
                />
              </div>
              {(editingUser.role === "pedagang" ||
                editingUser.role === "merchant") && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Alamat Toko
                  </label>
                  <textarea
                    rows={2}
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full bg-slate-100/50 border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-blue-400"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Password Baru (Opsional)
                </label>
                <input
                  type="password"
                  placeholder="Kosongkan jika tidak ingin ganti"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full bg-slate-100/50 border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-blue-400"
                />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-lg shadow-blue-600/20"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
