"use client";

import { useEffect, useState } from "react";

const IEye = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
);
const IEyeOff = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l18 18" /><path d="M10.6 10.6a3 3 0 0 0 4.2 4.2" /><path d="M9.9 4.24A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a17.8 17.8 0 0 1-3.3 4.2" /><path d="M6.6 6.6C3.9 8.2 2 12 2 12s3.5 7 10 7a10.9 10.9 0 0 0 3.5-.6" /></svg>
);
const ISun = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
);
const IMoon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
);

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = localStorage.getItem("vc-theme") as "light" | "dark" | null;
    const sys = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const t = stored || sys;
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
  }, []);

  function toggleTheme() {
    const t = theme === "dark" ? "light" : "dark";
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
    try {
      localStorage.setItem("vc-theme", t);
    } catch {
      /* ignore */
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Đăng nhập thất bại");
      }
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="vc-login">
      <div className="vc-login-top">
        <button className="vc-icon-btn" type="button" onClick={toggleTheme} title="Chuyển sáng/tối" aria-label="Chuyển giao diện sáng tối">
          {theme === "dark" ? <ISun /> : <IMoon />}
        </button>
      </div>

      <form className="vc-login-card" onSubmit={submit}>
        <div className="vc-login-head">
          <div className="vc-tile">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hussio-mark.png" alt="HUSSIO" />
          </div>
          <div className="vc-login-title">HUSSIO</div>
        </div>
        <p className="sub">Nhập mật khẩu để vào bảng điều khiển Voucher.</p>

        <div className="vc-pass">
          <input
            type={show ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mật khẩu"
            autoFocus
          />
          <button
            className="vc-eye"
            type="button"
            onClick={() => setShow((s) => !s)}
            title={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          >
            {show ? <IEyeOff /> : <IEye />}
          </button>
        </div>

        {error && <div className="vc-login-err">{error}</div>}

        <button type="submit" className="vc-submit" disabled={loading}>
          {loading ? "Đang vào…" : "Đăng nhập"}
        </button>
      </form>
    </div>
  );
}
