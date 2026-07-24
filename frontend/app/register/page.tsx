"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getApiUrl } from "@/lib/config";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("merchant");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const API_URL = getApiUrl();

      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Bypass-Tunnel-Remainder": "true",
        },
        body: JSON.stringify({
          username,
          full_name: fullName,
          email,
          password,
          role,
        }),
      });

      const data = (await response.json()) as { detail?: string };

      if (!response.ok) {
        throw new Error(data.detail || "Gagal mendaftar");
      }

      const formData = new URLSearchParams();
      formData.append("username", username);
      formData.append("password", password);

      const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      if (loginResponse.ok) {
        const loginData = (await loginResponse.json()) as {
          access_token: string;
        };
        localStorage.setItem("token", loginData.access_token);
        router.push("/");
      } else {
        router.push("/login");
      }
    } catch (err) {
      if (err instanceof Error && (err.name === "TypeError" || err.message === "Failed to fetch")) {
        setError(
          "Tidak dapat terhubung ke server API backend. Pastikan NEXT_PUBLIC_API_URL telah diatur di Vercel Environment Variables dan server backend aktif."
        );
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat mendaftar.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <AuthBackground />
      <section className="relative z-10 grid min-h-screen w-full place-items-center px-4 py-10">
        <div className="w-full max-w-xl animate-soft-enter">
          <div className="mb-7 text-center">
            <Link
              href="/"
              className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#1c1c1e] text-sm font-black text-white shadow-xl shadow-slate-900/15"
            >
              PP
            </Link>
            <h1 className="mt-5 text-3xl font-black text-slate-950">
              Daftar Akun Baru
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Siapkan akun toko untuk dashboard harga dan asisten AI.
            </p>
          </div>

          <div className="glass-card p-6 sm:p-8">
            <form className="space-y-5" onSubmit={handleRegister}>
              {error && <Notice>{error}</Notice>}

              <div>
                <span className="mb-3 block text-sm font-bold text-slate-600">
                  Pilih Peran Anda
                </span>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      value: "merchant",
                      label: "Pedagang",
                      emoji: "🏪",
                      desc: "Pelaku UMKM",
                    },
                    {
                      value: "buyer",
                      label: "Pembeli",
                      emoji: "🛒",
                      desc: "Konsumen Lokal",
                    },
                    {
                      value: "admin",
                      label: "Admin",
                      emoji: "🛡️",
                      desc: "Dinas/Sistem",
                    },
                  ].map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRole(r.value)}
                      className={`flex flex-col items-center gap-1 rounded-2xl border-2 p-3 text-center transition-all ${
                        role === r.value
                          ? "border-slate-900 bg-slate-900 text-white shadow-lg scale-[1.03]"
                          : "border-slate-200 bg-white/60 text-slate-600 hover:border-slate-400"
                      }`}
                    >
                      <span className="text-2xl">{r.emoji}</span>
                      <span className="text-xs font-black">{r.label}</span>
                      <span
                        className={`text-[10px] ${role === r.value ? "text-slate-300" : "text-slate-400"}`}
                      >
                        {r.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Nama Lengkap">
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="field-input"
                    placeholder="Nama lengkap Anda"
                  />
                </Field>

                <Field label="Username">
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="field-input"
                    placeholder="Username unik"
                  />
                </Field>
              </div>

              <Field label="Email">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="field-input"
                  placeholder="email@contoh.com"
                />
              </Field>

              <Field label="Password">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="field-input"
                  placeholder="Minimal 6 karakter"
                  minLength={6}
                />
              </Field>

              <button
                type="submit"
                disabled={loading}
                className="dark-pill w-full py-4 disabled:opacity-50"
              >
                {loading ? "Memproses..." : "Daftar Sekarang"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              Sudah punya akun?{" "}
              <Link
                href="/login"
                className="font-black text-slate-950 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-950"
              >
                Masuk di sini
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
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#f7f8fc]" />
      <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-sky-200/70 blur-3xl" />
      <div className="absolute right-[-10%] top-12 h-[28rem] w-[28rem] rounded-full bg-orange-200/60 blur-3xl" />
      <div className="absolute bottom-[-12rem] left-1/3 h-[30rem] w-[30rem] rounded-full bg-violet-200/60 blur-3xl" />
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

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-red-200/80 bg-red-50/70 px-4 py-3 text-sm font-semibold text-red-600">
      {children}
    </div>
  );
}
