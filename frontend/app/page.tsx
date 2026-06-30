"use client";

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
} from "recharts";
import {
  generateDescription,
  getAlerts,
  getPriceHistory,
  getPriceSummary,
  getRecommendations,
  getSuggestedQuestions,
  sendChatMessage,
} from "@/lib/api";
import type {
  ChartDataPoint,
  ChatMessage,
  PriceAlert,
  PriceSummary,
  Recommendation,
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

type View = "home" | "chat" | "recommendations" | "descriptions" | "alerts";
type IconName =
  | "plus"
  | "search"
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
  | "user";

import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const [activeView, setActiveView] = useState<View>("home");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [priceSummaries, setPriceSummaries] = useState<PriceSummary[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [descProductName, setDescProductName] = useState("");
  const [descCategory, setDescCategory] = useState("");
  const [descAdditionalInfo, setDescAdditionalInfo] = useState("");
  const [generatedDesc, setGeneratedDesc] = useState("");
  const [isDescLoading, setIsDescLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const category = activeCategory === "all" ? undefined : activeCategory;
      const [summaries, recs, alertsData, questions, history] =
        await Promise.all([
          getPriceSummary(category),
          getRecommendations(category),
          getAlerts(),
          getSuggestedQuestions(),
          getPriceHistory({ category, weeks: 12 }),
        ]);

      const grouped: Record<string, Record<string, number[]>> = {};
      history.forEach((item) => {
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
            prices.reduce((total, price) => total + price, 0) / prices.length
          );
        });
        return point;
      });

      setPriceSummaries(summaries);
      setRecommendations(recs);
      setAlerts(alertsData);
      setSuggestedQuestions(questions);
      setChartData(points);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [activeCategory]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

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
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error("Token invalid");
        return res.json();
      })
      .then(data => setCurrentUser(data))
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
            Object.keys(point).filter((key) => key !== "week")
          )
        )
      ),
    [chartData]
  );

  const formatRupiah = (num: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);

  const handleSendChat = async (message?: string) => {
    const msg = message || chatInput.trim();
    if (!msg) return;

    setActiveView("chat");
    setChatMessages((prev) => [...prev, { role: "user", content: msg }]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const response = await sendChatMessage(msg);
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.response, products: response.products },
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
        descAdditionalInfo
      );
      setGeneratedDesc(response.description);
    } catch {
      setGeneratedDesc("Gagal menghasilkan deskripsi. Pastikan backend berjalan.");
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
          userName={currentUser?.full_name || currentUser?.username || ""}
          onMenu={() => setSidebarOpen((open) => !open)}
        />

          <div className="flex-1 pb-32 pt-4 sm:pb-36">
            {isLoading ? (
              <LoadingState />
            ) : (
              <>
                {activeView === "home" && (
                  <HomeView
                    userName={currentUser?.full_name || currentUser?.username || "Pengguna"}
                    priceSummaries={priceSummaries}
                    recommendations={recommendations}
                    alerts={alerts}
                    formatRupiah={formatRupiah}
                    onOpenPrices={() => setPriceModalOpen(true)}
                    onFocusChat={focusChat}
                    onOpenDescription={() => setActiveView("descriptions")}
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

                {activeView === "recommendations" && (
                  <RecommendationsView
                    recommendations={recommendations}
                    formatRupiah={formatRupiah}
                  />
                )}

                {activeView === "descriptions" && (
                  <DescriptionView
                    descProductName={descProductName}
                    setDescProductName={setDescProductName}
                    descCategory={descCategory}
                    setDescCategory={setDescCategory}
                    descAdditionalInfo={descAdditionalInfo}
                    setDescAdditionalInfo={setDescAdditionalInfo}
                    generatedDesc={generatedDesc}
                    isDescLoading={isDescLoading}
                    onGenerate={handleGenerateDesc}
                  />
                )}

                {activeView === "alerts" && (
                  <AlertsView alerts={alerts} formatRupiah={formatRupiah} />
                )}
              </>
            )}
          </div>

          <FloatingChatInput
            inputRef={chatInputRef}
            value={chatInput}
            isLoading={isChatLoading}
            onChange={setChatInput}
            onSend={() => handleSendChat()}
            onQuickSend={handleSendChat}
            onOpenRouting={() => setRouteModalOpen(true)}
          />
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

      {routeModalOpen && (
        <SmartRouteModal 
          onClose={() => setRouteModalOpen(false)} 
          formatRupiah={formatRupiah}
        />
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
  onClose,
  onNewChat,
  onNavigate,
}: {
  open: boolean;
  activeView: View;
  alertCount: number;
  onClose: () => void;
  onNewChat: () => void;
  onNavigate: (view: View) => void;
}) {
  const router = useRouter();
  const items: { label: string; icon: IconName; view?: View; onClick?: () => void }[] =
    [
      { label: "Chat baru", icon: "plus", onClick: onNewChat },
      { label: "Chat AI", icon: "chat", view: "chat" },
      { label: "Rekomendasi", icon: "spark", view: "recommendations" },
      { label: "Deskripsi", icon: "doc", view: "descriptions" },
      { label: "Alert", icon: "bell", view: "alerts" },
      {
        label: "Profil",
        icon: "user",
        onClick: () => {
          router.push("/profile");
          onClose();
        },
      },
    ];

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-24 px-4 py-4 transition-transform duration-300 lg:sticky lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="glass-panel flex h-full flex-col items-center justify-between rounded-[2rem] px-3 py-5">
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              aria-label="Tutup navigasi"
              onClick={onClose}
              className="icon-button lg:hidden"
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
                  onClick={item.onClick ?? (() => item.view && onNavigate(item.view))}
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
          className="fixed inset-0 z-30 bg-slate-950/20 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}
    </>
  );
}

function Header({
  activeView,
  sidebarOpen,
  userName,
  onMenu,
}: {
  activeView: View;
  sidebarOpen: boolean;
  userName: string;
  onMenu: () => void;
}) {
  const viewTitle: Record<View, string> = {
    home: "Pasar Klewer Daily",
    chat: "Ruang Tanya AI",
    recommendations: "Rekomendasi Jualan",
    descriptions: "Generator Deskripsi",
    alerts: "Alert Harga",
  };

  return (
    <header className="glass-panel sticky top-4 z-50 flex items-center justify-between gap-4 rounded-[1.75rem] px-4 py-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          aria-label={sidebarOpen ? "Tutup navigasi" : "Buka navigasi"}
          onClick={onMenu}
          className="icon-button lg:hidden"
        >
          <Icon name={sidebarOpen ? "x" : "menu"} />
        </button>
        <button className="hidden items-center gap-2 rounded-full bg-white/60 px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-white/70 sm:flex">
          PasarPintar AI v1.0
          <Icon name="arrow" className="h-4 w-4" />
        </button>
      </div>

      <p className="truncate text-center text-sm font-semibold text-slate-600 sm:text-base">
        {viewTitle[activeView]}
      </p>

      <div className="dark-pill shrink-0">
        <Icon name="store" className="h-4 w-4" />
        <span className="hidden sm:inline">Toko {userName || "Anda"}</span>
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
    <section className="mx-auto grid w-full max-w-7xl gap-6 pt-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <div className="min-w-0">
        <div className="animate-soft-enter">
          <p className="mb-3 text-sm font-semibold text-slate-500">
            Untuk pedagang UMKM Solo Raya
          </p>
          <h1 className="max-w-4xl text-4xl font-bold leading-[1.05] tracking-normal text-slate-950 sm:text-6xl lg:text-7xl">
            Halo {userName}, Siap Laris Manis Hari Ini?
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Pantau harga pasar, tanya strategi jualan, dan buat materi produk
            dalam satu asisten yang ringan untuk dipakai setiap hari.
          </p>
        </div>

        <div className="mt-9 grid gap-4 md:grid-cols-3">
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

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <MetricCard label="Produk Dipantau" value={String(watched)} sub="item aktif" />
          <MetricCard label="Harga Naik" value={String(upward)} sub="perlu dicek" />
          <MetricCard
            label="Alert Baru"
            value={String(alerts.filter((alert) => !alert.is_read).length)}
            sub="anomali pasar"
          />
        </div>
      </div>

      <div className="relative min-h-[360px] lg:min-h-[520px]">
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
      <div className="speech-pop">Monggo, ada yang bisa dibantu?</div>
      <div className="mascot">
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
      <span className={`grid h-12 w-12 place-items-center rounded-2xl ${tintClass}`}>
        <Icon name={icon} />
      </span>
      <h2 className="mt-5 text-lg font-bold text-slate-950">{title}</h2>
      <p className="mt-3 min-h-[72px] text-sm leading-6 text-slate-600">{body}</p>
      <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-slate-950">
        {label}
        <Icon name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
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
            Pilih salah satu pertanyaan cepat atau langsung ketik di input bawah.
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
                <p className="whitespace-pre-wrap">{message.content}</p>
                {message.products && message.products.length > 0 && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {message.products.map((p) => (
                      <div key={p.id} className="glass-card flex flex-col justify-between overflow-hidden p-4">
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
              <span className="dark-pill text-xs">{labelAction(rec.action)}</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/60 p-4 ring-1 ring-white/70">
                <p className="text-xs font-semibold text-slate-500">Harga</p>
                <p className="mt-1 font-black text-slate-950">
                  {formatRupiah(rec.current_price)}
                </p>
              </div>
              <div className="rounded-2xl bg-white/60 p-4 ring-1 ring-white/70">
                <p className="text-xs font-semibold text-slate-500">Perubahan</p>
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
            <p className="mt-4 text-sm leading-7 text-slate-600">{rec.reason}</p>
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
  generatedDesc,
  isDescLoading,
  onGenerate,
}: {
  descProductName: string;
  setDescProductName: (value: string) => void;
  descCategory: string;
  setDescCategory: (value: string) => void;
  descAdditionalInfo: string;
  setDescAdditionalInfo: (value: string) => void;
  generatedDesc: string;
  isDescLoading: boolean;
  onGenerate: () => void;
}) {
  return (
    <section className="mx-auto grid w-full max-w-6xl animate-soft-enter gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="glass-card p-6">
        <PageTitle
          eyebrow="Copywriting produk"
          title="Buat deskripsi jualan otomatis"
        />
        <div className="mt-6 space-y-4">
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
            disabled={isDescLoading || !descProductName.trim()}
            className="dark-pill w-full justify-center py-4 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="spark" />
            {isDescLoading ? "Menghasilkan..." : "Generate Deskripsi AI"}
          </button>
        </div>
      </div>

      <div className="glass-panel rounded-[2rem] p-6">
        <p className="text-sm font-bold text-slate-500">Hasil</p>
        {generatedDesc ? (
          <>
            <div className="mt-4 rounded-[1.5rem] bg-white/65 p-5 text-sm leading-7 text-slate-700 ring-1 ring-white/70">
              <p className="whitespace-pre-wrap">{generatedDesc}</p>
            </div>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(generatedDesc)}
              className="mt-4 rounded-full bg-white/70 px-4 py-2 text-sm font-bold text-slate-700 ring-1 ring-white/80 transition hover:bg-white"
            >
              Salin deskripsi
            </button>
          </>
        ) : (
          <div className="mt-4 flex min-h-[320px] items-center justify-center rounded-[1.5rem] bg-white/45 p-6 text-center text-sm leading-6 text-slate-500 ring-1 ring-white/60">
            Deskripsi produk akan tampil di sini setelah dibuat.
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
                Estimasi nilai pantauan: {formatRupiah(Math.abs(alert.percentage_change) * 1000)}
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
}: {
  value: string;
  isLoading: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
  onQuickSend: (message: string) => void;
  onOpenRouting: () => void;
  inputRef: React.Ref<HTMLInputElement>;
}) {
  const prompts = [
    "Grafik Harga Batik",
    "Kapan waktu jual terbaik?",
    "Bandingkan harga saya",
  ];

  return (
    <div className="fixed bottom-4 left-4 right-4 z-30 mx-auto max-w-4xl lg:left-32">
      <div className="mb-2 mx-auto w-fit rounded-full bg-white/45 px-4 py-2 text-xs font-bold text-slate-500 backdrop-blur-xl ring-1 ring-white/70">
        Tingkatkan penjualan UMKM Anda
      </div>
      <div className="floating-input">
        <button type="button" aria-label="Mikrofon" className="icon-button">
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
          disabled={isLoading || !value.trim()}
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
      <span className="mb-2 block text-sm font-bold text-slate-600">{label}</span>
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
      {name === "plus" && <path d="M12 5v14M5 12h14" />}
      {name === "search" && <path d="m21 21-4.3-4.3M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z" />}
      {name === "clock" && <path d="M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />}
      {name === "chart" && <path d="M4 19V5M4 19h16M8 16v-5M12 16V8M16 16v-8M20 16v-3" />}
      {name === "chat" && <path d="M21 12a8 8 0 0 1-8 8H6l-3 2 1.4-4.2A8 8 0 1 1 21 12Z" />}
      {name === "doc" && <path d="M7 3h7l4 4v14H7zM14 3v5h5M9 13h6M9 17h6" />}
      {name === "mic" && <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3ZM5 11a7 7 0 0 0 14 0M12 18v3" />}
      {name === "send" && <path d="m22 2-7 20-4-9-9-4 20-7ZM11 13l4-4" />}
      {name === "bell" && <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />}
      {name === "spark" && <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3ZM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z" />}
      {name === "menu" && <path d="M4 7h16M4 12h16M4 17h16" />}
      {name === "x" && <path d="M18 6 6 18M6 6l12 12" />}
      {name === "store" && <path d="M4 10h16l-1-5H5l-1 5ZM6 10v9h12v-9M9 19v-5h6v5" />}
      {name === "arrow" && <path d="M5 12h14M13 6l6 6-6 6" />}
      {name === "user" && <path d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM5 21a7 7 0 0 1 14 0" />}
    </svg>
  );
}

function SmartRouteModal({
  onClose,
  formatRupiah,
}: {
  onClose: () => void;
  formatRupiah: (num: number) => string;
}) {
  const [destinations, setDestinations] = useState<string[]>([]);
  const [availableDestinations] = useState([
    "Laweyan", "Serengan", "Pasar Kliwon", "Jebres", "Banjarsari",
    "Grogol", "Kartasura", "Baki", "Colomadu", "Mojolaban"
  ]);
  const [routeResult, setRouteResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleDestination = (dest: string) => {
    if (destinations.includes(dest)) {
      setDestinations(destinations.filter(d => d !== dest));
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm animate-soft-enter">
      <div className="glass-modal w-full max-w-lg overflow-y-auto rounded-[2rem] p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">Rute Pintar Hemat Bensin</h2>
            <p className="text-sm font-semibold text-slate-500">Optimasi urutan pengantaran UMKM</p>
          </div>
          <button onClick={onClose} className="icon-button">
            <Icon name="x" />
          </button>
        </div>

        <div className="mb-6">
          <p className="mb-3 text-sm font-bold text-slate-600">Pilih Titik Pengantaran (Maks 5):</p>
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
          {error && <p className="mt-3 text-sm font-bold text-red-500">{error}</p>}
        </div>

        {routeResult ? (
          <div className="rounded-[1.5rem] bg-white/50 p-5 ring-1 ring-white/70 animate-card-up">
            <h3 className="mb-4 text-lg font-black text-slate-900">Rute Optimal:</h3>
            <div className="space-y-4">
              {routeResult.optimized_order.map((loc: string, idx: number) => (
                <div key={loc} className="flex items-center gap-4">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-black text-white">
                    {idx + 1}
                  </div>
                  <div className="font-bold text-slate-800">{loc}</div>
                </div>
              ))}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-white/70 p-4 ring-1 ring-white/80">
                <p className="text-xs font-bold text-slate-500">Total Jarak</p>
                <p className="text-xl font-black text-slate-900">{routeResult.total_distance_km.toFixed(1)} <span className="text-sm">km</span></p>
              </div>
              <div className="rounded-2xl bg-emerald-100 p-4 text-emerald-800 ring-1 ring-emerald-200">
                <p className="text-xs font-bold">Hemat Bensin s/d</p>
                <p className="text-xl font-black">{formatRupiah(routeResult.estimated_savings)}</p>
              </div>
            </div>
            <button
              onClick={() => setRouteResult(null)}
              className="mt-6 w-full rounded-full bg-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-300"
            >
              Ubah Rute
            </button>
          </div>
        ) : (
          <button
            onClick={handleOptimize}
            disabled={isLoading || destinations.length < 2}
            className="w-full rounded-full bg-slate-950 px-5 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Menghitung Rute Optimal..." : "Mulai Kalkulasi Rute"}
          </button>
        )}
      </div>
    </div>
  );
}
