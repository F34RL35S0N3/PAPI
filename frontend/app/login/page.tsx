"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

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

      const response = await fetch("http://localhost:8000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
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
      setError(err instanceof Error ? err.message : "Gagal login. Coba lagi.");
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
            <h1 className="mt-5 text-3xl font-black text-slate-950">
              Login ke PasarPintar AI
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Masuk untuk memantau harga pasar dan rekomendasi toko Anda.
            </p>
          </div>

          <div className="glass-card p-6 sm:p-8">
            <form className="space-y-5" onSubmit={handleLogin}>
              {error && <Notice tone="error">{error}</Notice>}

              <Field label="Username">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="field-input"
                  placeholder="Masukkan username"
                />
              </Field>

              <Field label="Password">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="field-input"
                  placeholder="Masukkan password"
                />
              </Field>

              <button
                type="submit"
                disabled={loading}
                className="dark-pill w-full py-4 disabled:opacity-50"
              >
                {loading ? "Memproses..." : "Masuk"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              Belum punya akun?{" "}
              <Link
                href="/register"
                className="font-black text-slate-950 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-950"
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
      <span className="mb-2 block text-sm font-bold text-slate-600">{label}</span>
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
    <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${className}`}>
      {children}
    </div>
  );
}
