"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getApiUrl } from "@/lib/config";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const formData = new URLSearchParams();
      formData.append("username", username);
      formData.append("password", password);

      const API_URL = getApiUrl();

      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Bypass-Tunnel-Remainder": "true",
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        throw new Error("Username atau password salah");
      }

      const data = (await response.json()) as { access_token: string };
      localStorage.setItem("token", data.access_token);
      router.push("/");
    } catch (err) {
      if (err instanceof Error && (err.name === "TypeError" || err.message === "Failed to fetch")) {
        setError(
          "Tidak dapat terhubung ke server API backend. Pastikan NEXT_PUBLIC_API_URL telah diatur di Vercel Environment Variables dan server backend aktif."
        );
      } else {
        setError(err instanceof Error ? err.message : "Gagal login. Coba lagi.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <AuthBackground />
      <section className="relative z-10 grid min-h-screen w-full place-items-center px-4 py-10">
        <div className="w-full max-w-md animate-soft-enter">
          <div className="mb-7 text-center">
            <Link
              href="/"
              className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#1c1c1e] text-sm font-black text-white shadow-xl shadow-slate-900/15"
            >
              PP
            </Link>
            <h1 className="mt-5 text-3xl font-black text-white">
              Login ke PasarPintar AI
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Masuk untuk memantau harga pasar dan rekomendasi toko Anda.
            </p>
          </div>

          <div className="p-6 sm:p-8 bg-white/20 backdrop-blur-xl border border-white/30 shadow-2xl shadow-slate-950/40 rounded-3xl">
            <form className="space-y-5" onSubmit={handleLogin}>
              {error && <Notice tone="error">{error}</Notice>}

              <Field label="Username">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="w-full rounded-xl border border-white/30 bg-white/20 px-4 py-3 text-sm text-white placeholder:text-slate-200 backdrop-blur-md transition-all focus:border-white focus:bg-white/30 focus:outline-none focus:ring-4 focus:ring-white/20 font-medium"
                  placeholder="Masukkan username"
                />
              </Field>

              <Field label="Password">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-white/30 bg-white/20 px-4 py-3 text-sm text-white placeholder:text-slate-200 backdrop-blur-md transition-all focus:border-white focus:bg-white/30 focus:outline-none focus:ring-4 focus:ring-white/20 font-medium"
                  placeholder="Masukkan password"
                />
              </Field>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-950/30 transition-all hover:from-emerald-500 hover:to-teal-500 hover:shadow-emerald-600/40 active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? "Memproses..." : "Masuk"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm font-medium text-slate-200">
              Belum punya akun?{" "}
              <Link
                href="/register"
                className="font-bold text-white hover:text-emerald-200 underline decoration-white/40 underline-offset-4 hover:decoration-white"
              >
                Daftar sekarang
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function AuthBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Background Image with soft blur & high visibility */}
      <img
        src="/bg.jpeg"
        alt="Background"
        className="absolute inset-0 h-full w-full object-cover filter blur-[4px] scale-105 opacity-85"
      />
      {/* Soft overlay */}
      <div className="absolute inset-0 bg-slate-950/50" />
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
      <span className="mb-2 block text-sm font-bold text-white">
        {label}
      </span>
      {children}
    </label>
  );
}

function Notice({
  tone,
  children,
}: {
  tone: "error" | "success";
  children: React.ReactNode;
}) {
  const className =
    tone === "error"
      ? "border-red-200/80 bg-red-50/70 text-red-600"
      : "border-emerald-200/80 bg-emerald-50/70 text-emerald-700";

  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${className}`}
    >
      {children}
    </div>
  );
}
