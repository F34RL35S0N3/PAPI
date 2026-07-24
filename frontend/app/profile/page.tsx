"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getApiUrl } from "@/lib/config";

type UserProfile = {
  id?: number;
  username: string;
  full_name?: string | null;
  email: string;
  role?: string;
  profile_picture?: string | null;
  address?: string | null;
  district?: string | null;
};

type Message = {
  text: string;
  type: "success" | "error" | "";
};

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message>({ text: "", type: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const API_URL = getApiUrl();
        const response = await fetch(`${API_URL}/api/auth/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Sesi berakhir");
        }

        const data = (await response.json()) as UserProfile;
        setUser(data);
        setFullName(data.full_name || "");
        setEmail(data.email);
        setAddress(data.address || "");
        setDistrict(data.district || "");
      } catch {
        localStorage.removeItem("token");
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  const handleUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;

    setSaving(true);
    setMessage({ text: "", type: "" });
    const token = localStorage.getItem("token");

    try {
      const formData = new FormData();
      if (fullName !== (user.full_name || ""))
        formData.append("full_name", fullName);
      if (email !== user.email) formData.append("email", email);
      if (password) formData.append("password", password);
      if (address !== (user.address || "")) formData.append("address", address);
      if (district !== (user.district || ""))
        formData.append("district", district);
      if (fileInputRef.current?.files?.[0]) {
        formData.append("profile_picture", fileInputRef.current.files[0]);
      }

      if (Array.from(formData.keys()).length === 0) {
        setMessage({ text: "Tidak ada perubahan.", type: "error" });
        setSaving(false);
        return;
      }

      const API_URL = getApiUrl();
      const response = await fetch(`${API_URL}/api/auth/profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { detail?: string };
        throw new Error(errorData.detail || "Gagal memperbarui profil");
      }

      const updatedUser = (await response.json()) as UserProfile;
      setUser(updatedUser);
      setPassword("");
      if (fileInputRef.current) fileInputRef.current.value = "";

      setMessage({ text: "Profil berhasil diperbarui.", type: "success" });
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Gagal memperbarui profil.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  if (loading) {
    return (
      <main className="auth-shell">
        <AuthBackground />
        <div className="relative z-10 flex min-h-screen items-center justify-center">
          <div className="glass-panel rounded-[2rem] px-8 py-7 text-center">
            <div className="mx-auto mb-4 block h-14 w-14 overflow-hidden rounded-2xl shadow-md">
              <img
                src="/logo_papi.png"
                alt="PasarPintar AI Logo"
                className="h-full w-full object-cover"
              />
            </div>
            <p className="text-sm font-semibold text-slate-500">
              Memuat profil...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!user) return null;

  const displayName = user.full_name || user.username;
  const initial = displayName.charAt(0).toUpperCase();
  const API_URL = getApiUrl();
  const imageUrl = user.profile_picture
    ? `${API_URL}${user.profile_picture}`
    : "";

  return (
    <main className="auth-shell min-h-screen">
      <AuthBackground />
      <section className="relative z-10 mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
        <header className="glass-panel mb-6 flex items-center justify-between gap-4 rounded-[1.75rem] px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              className="icon-button"
              aria-label="Kembali dashboard"
            >
              <ArrowLeftIcon />
            </Link>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                Akun toko
              </p>
              <h1 className="truncate text-xl font-black text-slate-950 sm:text-2xl">
                Profil Saya
              </h1>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full border border-red-200/80 bg-red-50/70 px-4 py-2 text-sm font-black text-red-600 transition hover:bg-red-100/80"
          >
            Logout
          </button>
        </header>

        <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="glass-card p-6">
            <div className="flex flex-col items-center text-center">
              <div className="relative grid h-32 w-32 place-items-center overflow-hidden rounded-[2rem] bg-white/70 text-4xl font-black text-slate-950 ring-1 ring-white/80">
                {imageUrl ? (
                  <div
                    className="h-full w-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${imageUrl})` }}
                    aria-label="Foto profil"
                  />
                ) : (
                  initial
                )}
              </div>
              <h2 className="mt-5 text-2xl font-black text-slate-950">
                {displayName}
              </h2>
              <p className="mt-1 text-sm text-slate-500">@{user.username}</p>
              <div className="mt-5 w-full rounded-[1.5rem] bg-white/55 p-4 text-left ring-1 ring-white/70">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  Email
                </p>
                <p className="mt-1 break-all text-sm font-bold text-slate-700">
                  {user.email}
                </p>
              </div>
            </div>
          </aside>

          <section className="glass-card p-6 sm:p-8">
            <div className="mb-6">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
                Pengaturan
              </p>
              <h2 className="mt-2 text-3xl font-black text-slate-950">
                Perbarui identitas toko
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Informasi ini dipakai untuk menyapa Anda di dashboard dan
                menjaga akun tetap mudah dikenali.
              </p>
            </div>

            {message.text && (
              <Notice tone={message.type === "success" ? "success" : "error"}>
                {message.text}
              </Notice>
            )}

            <form onSubmit={handleUpdate} className="mt-6 space-y-6">
              <Field label="Foto Profil Baru">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="file-input"
                />
                <p className="mt-2 text-xs font-semibold text-slate-400">
                  JPG, PNG, atau GIF maks. 2MB.
                </p>
              </Field>

              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Nama Lengkap">
                  <input
                    type="text"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="field-input"
                    placeholder="Nama lengkap Anda"
                  />
                </Field>

                <Field label="Username">
                  <input
                    type="text"
                    value={user.username}
                    disabled
                    className="field-input cursor-not-allowed opacity-65"
                  />
                  <p className="mt-2 text-xs font-semibold text-slate-400">
                    Username tidak dapat diubah.
                  </p>
                </Field>
              </div>

              <Field label="Email">
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="field-input"
                />
              </Field>

              {user.role === "buyer" && (
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Kecamatan Domisili (Solo Raya)">
                    <select
                      value={district}
                      onChange={(event) => setDistrict(event.target.value)}
                      className="field-input"
                    >
                      <option value="">Pilih Kecamatan...</option>
                      <option value="Banjarsari">Banjarsari</option>
                      <option value="Jebres">Jebres</option>
                      <option value="Laweyan">Laweyan</option>
                      <option value="Pasar Kliwon">Pasar Kliwon</option>
                      <option value="Serengan">Serengan</option>
                    </select>
                  </Field>

                  <Field label="Alamat Lengkap">
                    <textarea
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                      className="field-input min-h-[100px]"
                      placeholder="Contoh: Jl. Slamet Riyadi No. 123..."
                    />
                  </Field>
                </div>
              )}

              <div className="rounded-[1.5rem] bg-white/45 p-5 ring-1 ring-white/70">
                <h3 className="text-lg font-black text-slate-950">
                  Ganti Password
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Biarkan kosong jika Anda tidak ingin mengubah password.
                </p>
                <div className="mt-4 max-w-md">
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="field-input"
                    placeholder="Minimal 6 karakter"
                    minLength={6}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="dark-pill px-6 py-4 disabled:opacity-50"
                >
                  {saving ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </section>
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

function Notice({
  tone,
  children,
}: {
  tone: "success" | "error";
  children: React.ReactNode;
}) {
  const className =
    tone === "success"
      ? "border-emerald-200/80 bg-emerald-50/70 text-emerald-700"
      : "border-red-200/80 bg-red-50/70 text-red-600";

  return (
    <div
      className={`mb-5 rounded-2xl border px-4 py-3 text-sm font-semibold ${className}`}
    >
      {children}
    </div>
  );
}

function ArrowLeftIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path d="M19 12H5M11 18l-6-6 6-6" />
    </svg>
  );
}
