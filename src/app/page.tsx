"use client";

import { useEffect, useMemo, useState } from "react";
import type { DashboardData, DiscountSummary, VoucherCode } from "@/lib/types";
import QrCode, { downloadQrPng, qrSvgMarkup } from "@/components/QrCode";

type Filter = "all" | "used" | "unused";
const DOMAIN = "hussio.com";

// Link áp mã (khách bấm là tự áp voucher) — cũng là nội dung mã QR.
const voucherLink = (code: string) => `https://${DOMAIN}/discount/${code}`;

// ==== Icon SVG (không dùng emoji) ====
const IArrow = () => (
  <svg className="vc-arw" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></svg>
);
const IBack = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
);
const ISearch = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
);
const IReload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></svg>
);
const ISun = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
);
const IMoon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
);
const IQr = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3M20 14v.01M14 20h.01M17 20h3v-3" /></svg>
);
const ICopy = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
);
const IDownload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></svg>
);
const IPrint = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" rx="1" /></svg>
);
const IClose = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
);

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [qrRow, setQrRow] = useState<VoucherCode | null>(null); // mã đang xem QR
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const stored = (typeof window !== "undefined"
      ? (localStorage.getItem("vc-theme") as "light" | "dark" | null)
      : null);
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

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/discounts", { cache: "no-store" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Không tải được dữ liệu");
      setData(j as DashboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  // Đóng modal QR bằng phím Esc.
  useEffect(() => {
    if (!qrRow) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setQrRow(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [qrRow]);

  async function logout() {
    await fetch("/api/login", { method: "DELETE" });
    window.location.href = "/login";
  }

  const discounts = data?.discounts ?? [];
  const codes = data?.codes ?? [];

  // Chương trình có danh sách mã (kéo vào xem chi tiết được)
  const codeCountBy = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of codes) m.set(c.discountId, (m.get(c.discountId) || 0) + 1);
    return m;
  }, [codes]);

  // Chương trình loyalty = discount nhiều mã nhất
  const loyalty = useMemo<DiscountSummary | null>(() => {
    let best: DiscountSummary | null = null;
    for (const d of discounts) if (!best || d.totalCodes > best.totalCodes) best = d;
    return best;
  }, [discounts]);

  const activeCount = discounts.filter((d) => d.status === "ACTIVE").length;
  const lTotal = loyalty?.totalCodes ?? 0;
  const lUsed = loyalty?.totalUsed ?? 0;
  const lRate = lTotal ? Math.round((lUsed / lTotal) * 100) : 0;

  const selected = discounts.find((d) => d.id === selectedId) || null;
  const selCodes = useMemo(
    () => codes.filter((c) => c.discountId === selectedId),
    [codes, selectedId]
  );
  const selUsed = selCodes.filter((c) => c.used).length;
  const selUnused = selCodes.length - selUsed;
  const selRate = selCodes.length ? Math.round((selUsed / selCodes.length) * 100) : 0;

  const rows: VoucherCode[] = useMemo(() => {
    const q = search.trim().toLowerCase();
    return selCodes.filter((c) => {
      if (filter === "used" && !c.used) return false;
      if (filter === "unused" && c.used) return false;
      if (q && !c.code.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [selCodes, filter, search]);

  function open(id: string) {
    setSelectedId(id);
    setFilter("all");
    setSearch("");
    window.scrollTo(0, 0);
  }
  function back() {
    setSelectedId(null);
    window.scrollTo(0, 0);
  }

  const exportUrl = (fmt: "xlsx" | "csv", unused = false) =>
    `/api/export?format=${fmt}${selectedId ? `&discountId=${encodeURIComponent(selectedId)}` : ""}${unused ? "&status=unused" : ""}`;

  // Sao chép link áp mã vào clipboard.
  async function copyLink(code: string) {
    try {
      await navigator.clipboard.writeText(voucherLink(code));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* trình duyệt cũ không hỗ trợ — bỏ qua */
    }
  }

  // Mở trang in gồm toàn bộ mã QR đang hiển thị (kèm mã voucher dưới mỗi QR).
  function printQrSheet() {
    const win = window.open("", "_blank");
    if (!win) return;
    const cards = rows
      .map(
        (c) =>
          `<div class="card"><div class="qr">${qrSvgMarkup(
            voucherLink(c.code),
            4,
            2
          )}</div><div class="code">${c.code}</div></div>`
      )
      .join("");
    const heading = selected ? selected.title : "Voucher HUSSIO";
    win.document.write(
      `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Mã QR — ${heading}</title>
      <style>
        *{box-sizing:border-box} body{font-family:Segoe UI,system-ui,Arial,sans-serif;margin:24px;color:#15142c}
        h1{font-size:18px;margin:0 0 4px} p{margin:0 0 18px;color:#6a6a84;font-size:12px}
        .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
        .card{border:1px solid #e0e0ee;border-radius:10px;padding:10px;text-align:center;page-break-inside:avoid}
        .qr{display:flex;justify-content:center}
        .qr svg{width:100%;height:auto;max-width:150px}
        .code{margin-top:6px;font-family:Consolas,monospace;font-size:11px;word-break:break-all}
        @media print{@page{margin:12mm}}
      </style></head>
      <body onload="setTimeout(function(){window.print()},250)">
        <h1>${heading} — Mã QR</h1>
        <p>${rows.length} mã · quét QR để mở link áp voucher</p>
        <div class="grid">${cards}</div>
      </body></html>`
    );
    win.document.close();
  }

  return (
    <div className="vc-app">
      {/* ===== Header ===== */}
      <header className="vc-top rise">
        <button className="vc-home" onClick={back} title="Về trang chủ" aria-label="Về trang chủ">
          <div className="vc-tile">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hussio-mark.png" alt="HUSSIO" />
          </div>
          <div>
            <div className="vc-word">HUSSIO</div>
            <div className="vc-kicker">Bảng điều khiển Voucher · theo dõi lượt sử dụng</div>
          </div>
        </button>
        <div className="vc-actions">
          <button className="vc-icon-btn" onClick={toggleTheme} title="Chuyển sáng/tối" aria-label="Chuyển giao diện sáng tối">
            {theme === "dark" ? <ISun /> : <IMoon />}
          </button>
          <button className="vc-btn" onClick={load} disabled={loading}>
            <IReload /> {loading ? "Đang tải…" : "Tải lại"}
          </button>
          <button className="vc-btn ghost" onClick={logout}>Đăng xuất</button>
        </div>
      </header>

      <hr className="vc-hr" />

      {error && <div className="vc-banner err">{error}</div>}

      {loading && !data ? (
        <div className="vc-panel"><div className="vc-empty">Đang tải dữ liệu từ Shopify…</div></div>
      ) : selected ? (
        /* ===== DETAIL ===== */
        <section className="rise">
          <button className="vc-btn" onClick={back} style={{ marginBottom: 18 }}>
            <IBack /> Về danh sách voucher
          </button>
          <div className="vc-dtop">
            <h1>{selected.title}</h1>
            {selected.status === "ACTIVE" ? (
              <span className="pill on"><span className="dotp" />Đang chạy</span>
            ) : (
              <span className="pill off">Hết hạn</span>
            )}
            {selected.usageLimit === 1 && <span className="tag">Mỗi mã dùng 1 lần</span>}
          </div>
          <p className="vc-dsub">{selCodes.length} mã · 1 mã đã dùng = 1 khách đã đổi voucher.</p>

          <div className="vc-meter">
            <div className="big">{selRate}%<small>đã đổi</small></div>
            <div>
              <div className="vc-mstats">
                <div className="s good"><div className="k">Đã dùng</div><div className="n">{selUsed}</div></div>
                <div className="s gold"><div className="k">Chưa dùng</div><div className="n">{selUnused}</div></div>
                <div className="s"><div className="k">Tổng mã</div><div className="n">{selCodes.length}</div></div>
              </div>
              <div className="vc-bar"><i style={{ width: `${selRate}%` }} /></div>
            </div>
          </div>

          <div className="vc-tools">
            <div className="vc-field">
              <ISearch />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm mã… (vd 057)" />
            </div>
            <div className="vc-seg">
              {(["all", "used", "unused"] as Filter[]).map((f) => (
                <button key={f} className={filter === f ? "act" : ""} onClick={() => setFilter(f)}>
                  {f === "all" ? "Tất cả" : f === "used" ? "Đã dùng" : "Chưa dùng"}
                </button>
              ))}
            </div>
            <a className="vc-btn" href={exportUrl("xlsx")}>Xuất Excel</a>
            <a className="vc-btn" href={exportUrl("xlsx", true)}>Chưa dùng</a>
            <button className="vc-btn" onClick={printQrSheet} disabled={rows.length === 0}>
              <IPrint /> In QR
            </button>
          </div>
          <div className="vc-count">Hiển thị {rows.length} / {selCodes.length} mã</div>

          <div className="vc-panel">
            <div className="vc-scroll tall">
              <table>
                <thead><tr><th style={{ width: 58 }}>STT</th><th>Mã voucher</th><th>Trạng thái</th><th>Link áp mã</th><th style={{ width: 64 }} className="c">QR</th></tr></thead>
                <tbody>
                  {rows.map((c, i) => (
                    <tr key={c.code}>
                      <td className="num">{i + 1}</td>
                      <td className="mono">{c.code}</td>
                      <td>
                        {c.used
                          ? <span className="pill used"><span className="dotp" />Đã dùng</span>
                          : <span className="pill unused"><span className="dotp" />Chưa dùng</span>}
                      </td>
                      <td><a href={voucherLink(c.code)} target="_blank" rel="noopener noreferrer">/discount/{c.code}</a></td>
                      <td className="c">
                        <button
                          className="vc-qrbtn"
                          onClick={() => { setCopied(false); setQrRow(c); }}
                          title={`Xem / tải QR mã ${c.code}`}
                          aria-label={`Xem mã QR cho ${c.code}`}
                        >
                          <QrCode text={voucherLink(c.code)} size={40} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : (
        /* ===== MASTER ===== */
        <section>
          <div className="eyebrow rise" style={{ animationDelay: ".04s" }}>Tổng quan</div>
          <div className="vc-strip rise" style={{ animationDelay: ".08s" }}>
            <div className="vc-stat"><div className="k">Chương trình</div><div className="v">{discounts.length} <small>· {activeCount} đang chạy</small></div></div>
            <div className="vc-stat"><div className="k">Voucher loyalty</div><div className="v">{lTotal}</div></div>
            <div className="vc-stat good"><div className="k">Đã dùng (loyalty)</div><div className="v">{lUsed}</div></div>
            <div className="vc-stat gold"><div className="k">Tỷ lệ dùng</div><div className="v">{lRate}%</div></div>
          </div>

          <div className="vc-sechead rise" style={{ animationDelay: ".12s" }}>
            <div className="eyebrow">Tất cả chương trình</div>
            <span className="hint">bấm dòng có mũi tên để xem danh sách mã</span>
          </div>
          <div className="vc-panel rise" style={{ animationDelay: ".14s" }}>
            <div className="vc-scroll">
              <table>
                <thead><tr>
                  <th>Chương trình</th><th>Loại</th><th>Trạng thái</th>
                  <th className="r">Số mã</th><th className="r">Đã dùng</th><th></th>
                </tr></thead>
                <tbody>
                  {discounts.map((d) => {
                    const n = codeCountBy.get(d.id) || 0;
                    const drill = n > 1;
                    return (
                      <tr key={d.id} className={drill ? "clk" : ""} onClick={drill ? () => open(d.id) : undefined}>
                        <td><div className="vc-pname">{d.title}{d.method ? <span className="m">{d.method}</span> : null}</div></td>
                        <td><span className="tag">{d.kind === "automatic" ? "Tự động" : "Mã"}</span></td>
                        <td>{d.status === "ACTIVE" ? <span className="pill on"><span className="dotp" />Đang chạy</span> : <span className="pill off">Hết hạn</span>}</td>
                        <td className="r num">{d.kind === "automatic" ? "—" : d.totalCodes}</td>
                        <td className="r"><span className={`vc-u ${d.totalUsed > 0 ? "p" : "z"}`}>{d.totalUsed}</span></td>
                        <td className="r">{drill ? <span className="vc-go">{n} mã <IArrow /></span> : null}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <p className="vc-note rise" style={{ animationDelay: ".18s" }}>
            Tổng lượt sử dụng toàn store: <b>{discounts.reduce((s, d) => s + d.totalUsed, 0)}</b> lượt.
          </p>
        </section>
      )}

      <footer className="vc-foot">
        Dữ liệu từ <b>Shopify</b> HUSSIO{data?.source === "snapshot" ? " (ảnh chụp demo)" : " (realtime)"} · bấm <b>Tải lại</b> để cập nhật.
      </footer>

      {/* ===== Modal xem / tải QR 1 mã ===== */}
      {qrRow && (
        <div className="vc-ov" onClick={() => setQrRow(null)}>
          <div className="vc-qrmodal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Mã QR ${qrRow.code}`}>
            <button className="vc-qrx" onClick={() => setQrRow(null)} aria-label="Đóng"><IClose /></button>
            <div className="vc-qrbig"><QrCode text={voucherLink(qrRow.code)} size={220} margin={2} /></div>
            <div className="vc-qrcode mono">{qrRow.code}</div>
            <div className="vc-qrlink">{voucherLink(qrRow.code)}</div>
            <div className="vc-qracts">
              <button className="vc-btn" onClick={() => downloadQrPng(voucherLink(qrRow.code), `HUSSIO_QR_${qrRow.code}.png`)}>
                <IDownload /> Tải PNG
              </button>
              <button className="vc-btn" onClick={() => copyLink(qrRow.code)}>
                <ICopy /> {copied ? "Đã sao chép!" : "Sao chép link"}
              </button>
              <a className="vc-btn ghost" href={voucherLink(qrRow.code)} target="_blank" rel="noopener noreferrer">Mở link</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
