"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import type { DashboardData, VoucherCode } from "@/lib/types";
import QrCode, { downloadQrPng, qrSvgMarkup } from "@/components/QrCode";
import { buildVoucherUrl } from "@/lib/voucher-url";
import { discountStatusLabel, summarizeLoyalty } from "@/lib/dashboard";

type Filter = "all" | "used" | "unused";
const PAGE_SIZE = 100;
const EMPTY_DISCOUNTS: DashboardData["discounts"] = [];
const EMPTY_CODES: DashboardData["codes"] = [];

// Link áp mã (khách bấm là tự áp voucher) — cũng là nội dung mã QR.
const voucherLink = (domain: string | undefined, code: string) => buildVoucherUrl(domain, code);

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char] || char);
}

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
  const [page, setPage] = useState(1);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [qrRow, setQrRow] = useState<VoucherCode | null>(null); // mã đang xem QR
  const [copied, setCopied] = useState(false);
  const qrDialogRef = useRef<HTMLDivElement>(null);
  const qrCloseRef = useRef<HTMLButtonElement>(null);
  const lastQrTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("vc-theme") as "light" | "dark" | null;
    const nextTheme = stored || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    // Đồng bộ state với theme đã áp dụng sớm trong layout mà không làm lệch hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
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
      // Session hết hạn / bị đăng xuất -> quay về trang đăng nhập thay vì kẹt ở banner lỗi.
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
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
    // Tải dữ liệu lần đầu khi dashboard được gắn vào DOM.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  // Giữ focus trong modal, hỗ trợ Esc và trả focus về nút đã mở modal.
  useEffect(() => {
    if (!qrRow) return;
    qrCloseRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setQrRow(null); };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      lastQrTriggerRef.current?.focus();
    };
  }, [qrRow]);

  function trapModalFocus(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;
    const focusable = Array.from(
      qrDialogRef.current?.querySelectorAll<HTMLElement>("button, a[href]") || []
    ).filter((element) => !element.hasAttribute("disabled"));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  async function logout() {
    await fetch("/api/login", { method: "DELETE" });
    window.location.href = "/login";
  }

  const discounts = data?.discounts ?? EMPTY_DISCOUNTS;
  const codes = data?.codes ?? EMPTY_CODES;

  // Chương trình có danh sách mã (kéo vào xem chi tiết được)
  const codeCountBy = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of codes) m.set(c.discountId, (m.get(c.discountId) || 0) + 1);
    return m;
  }, [codes]);

  // Loyalty hiện là các chương trình bulk-code dùng một lần.
  const loyalty = useMemo(() => summarizeLoyalty(discounts), [discounts]);

  const activeCount = discounts.filter((d) => d.status === "ACTIVE").length;
  const lTotal = loyalty.totalCodes;
  const lUsed = loyalty.totalUsed;
  const lRate = lTotal ? Math.round((lUsed / lTotal) * 100) : 0;

  const selected = discounts.find((d) => d.id === selectedId) || null;
  const selectedSingleUse = selected?.usageLimit === 1;
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

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function open(id: string) {
    setSelectedId(id);
    setFilter("all");
    setSearch("");
    setPage(1);
    window.scrollTo(0, 0);
  }
  function back() {
    setSelectedId(null);
    window.scrollTo(0, 0);
  }

  const exportUrl = (fmt: "xlsx" | "csv", unused = false) => {
    const params = new URLSearchParams({ format: fmt });
    if (selectedId) params.set("discountId", selectedId);
    const exportStatus = unused ? "unused" : filter === "all" ? "" : filter;
    if (exportStatus) params.set("status", exportStatus);
    if (!unused && search.trim()) params.set("search", search.trim());
    return `/api/export?${params.toString()}`;
  };

  // Sao chép link áp mã vào clipboard.
  async function copyLink(code: string) {
    try {
      await navigator.clipboard.writeText(voucherLink(data?.publicDomain, code));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Trình duyệt không cho phép sao chép. Hãy sao chép link thủ công.");
    }
  }

  // Mở trang in gồm toàn bộ mã QR đang hiển thị (kèm mã voucher dưới mỗi QR).
  function printQrSheet() {
    const win = window.open("", "_blank");
    if (!win) {
      setError("Trình duyệt đang chặn cửa sổ in. Hãy cho phép popup rồi thử lại.");
      return;
    }
    const cards = pageRows
      .map(
        (c) =>
          `<div class="card"><div class="qr">${qrSvgMarkup(
            voucherLink(data?.publicDomain, c.code),
            4,
            2
          )}</div><div class="code">${escapeHtml(c.code)}</div></div>`
      )
      .join("");
    const heading = escapeHtml(selected ? selected.title : "Voucher HUSSIO");
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
        <p>${pageRows.length} mã · trang ${safePage}/${pageCount} · quét QR để mở link áp voucher</p>
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
            <IReload /> {loading ? "Đang tải…" : data?.source === "snapshot" ? "Đọc lại snapshot" : "Tải lại"}
          </button>
          <button className="vc-btn ghost" onClick={logout}>Đăng xuất</button>
        </div>
      </header>

      <hr className="vc-hr" />

      {error && <div className="vc-banner err">{error}</div>}

      {loading && !data ? (
        <div className="vc-panel"><div className="vc-empty">Đang tải dữ liệu voucher…</div></div>
      ) : selected ? (
        /* ===== DETAIL ===== */
        <section className="rise">
          <button className="vc-btn" onClick={back} style={{ marginBottom: 18 }}>
            <IBack /> Về danh sách voucher
          </button>
          <div className="vc-dtop">
            <h1>{selected.title}</h1>
            <span className={`pill ${selected.status === "ACTIVE" ? "on" : "off"}`}>
              {selected.status === "ACTIVE" && <span className="dotp" />}
              {discountStatusLabel(selected.status)}
            </span>
            {selected.usageLimit === 1 && <span className="tag">Mỗi mã dùng 1 lần</span>}
          </div>
          <p className="vc-dsub">
            {selCodes.length} mã · {selectedSingleUse
              ? "1 mã đã dùng = 1 khách đã đổi voucher."
              : "Lượt sử dụng được Shopify cập nhật theo từng mã."}
          </p>

          <div className="vc-meter">
            <div className="big">{selRate}%<small>đã đổi</small></div>
            <div>
              <div className="vc-mstats">
                <div className="s good"><div className="k">{selectedSingleUse ? "Đã dùng" : "Có lượt dùng"}</div><div className="n">{selUsed}</div></div>
                <div className="s gold"><div className="k">{selectedSingleUse ? "Chưa dùng" : "Chưa có lượt"}</div><div className="n">{selUnused}</div></div>
                <div className="s"><div className="k">Tổng mã</div><div className="n">{selCodes.length}</div></div>
              </div>
              <div className="vc-bar"><i style={{ width: `${selRate}%` }} /></div>
            </div>
          </div>

          <div className="vc-tools">
            <div className="vc-field">
              <ISearch />
              <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Tìm mã… (vd 057)" />
            </div>
            <div className="vc-seg">
              {(["all", "used", "unused"] as Filter[]).map((f) => (
                <button key={f} aria-pressed={filter === f} className={filter === f ? "act" : ""} onClick={() => { setFilter(f); setPage(1); }}>
                  {f === "all" ? "Tất cả" : f === "used"
                    ? selectedSingleUse ? "Đã dùng" : "Có lượt dùng"
                    : selectedSingleUse ? "Chưa dùng" : "Chưa có lượt"}
                </button>
              ))}
            </div>
            <a className="vc-btn" href={exportUrl("xlsx")}>Xuất Excel</a>
            <a className="vc-btn" href={exportUrl("xlsx", true)}>Chưa dùng</a>
            <a className="vc-btn" href={exportUrl("csv")}>Xuất CSV</a>
            <button className="vc-btn" onClick={printQrSheet} disabled={pageRows.length === 0}>
              <IPrint /> In QR trang này
            </button>
          </div>
          <div className="vc-count">
            Hiển thị {rows.length ? (safePage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(safePage * PAGE_SIZE, rows.length)} / {rows.length} kết quả
          </div>

          <div className="vc-panel">
            <div className="vc-scroll tall">
              <table>
                <thead><tr><th style={{ width: 58 }}>STT</th><th>Mã voucher</th><th>Trạng thái</th><th>Link áp mã</th><th style={{ width: 64 }} className="c">QR</th></tr></thead>
                <tbody>
                  {pageRows.map((c, i) => (
                    <tr key={c.code}>
                      <td className="num">{(safePage - 1) * PAGE_SIZE + i + 1}</td>
                      <td className="mono">{c.code}</td>
                      <td>
                        {c.used
                          ? <span className="pill used"><span className="dotp" />{selectedSingleUse ? "Đã dùng" : "Có lượt dùng"}</span>
                          : <span className="pill unused"><span className="dotp" />{selectedSingleUse ? "Chưa dùng" : "Chưa có lượt"}</span>}
                      </td>
                      <td><a href={voucherLink(data?.publicDomain, c.code)} target="_blank" rel="noopener noreferrer">/discount/{c.code}</a></td>
                      <td className="c">
                        <button
                          className="vc-qrbtn"
                          onClick={(event) => {
                            lastQrTriggerRef.current = event.currentTarget;
                            setCopied(false);
                            setQrRow(c);
                          }}
                          title={`Xem / tải QR mã ${c.code}`}
                          aria-label={`Xem mã QR cho ${c.code}`}
                        >
                          <IQr />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {pageRows.length === 0 && (
                    <tr><td colSpan={5}><div className="vc-empty">Không tìm thấy voucher phù hợp.</div></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {pageCount > 1 && (
            <nav className="vc-pagination" aria-label="Phân trang voucher">
              <button className="vc-btn" onClick={() => setPage(Math.max(1, safePage - 1))} disabled={safePage === 1}>Trang trước</button>
              <span>Trang {safePage} / {pageCount}</span>
              <button className="vc-btn" onClick={() => setPage(Math.min(pageCount, safePage + 1))} disabled={safePage === pageCount}>Trang sau</button>
            </nav>
          )}
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
            <span className="hint">bấm tên chương trình có mũi tên để xem danh sách mã</span>
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
                    const drill = n >= 1;
                    return (
                      <tr key={d.id}>
                        <td>{drill ? (
                          <button className="vc-program-button" onClick={() => open(d.id)}>
                            <span className="vc-pname">{d.title}{d.method ? <span className="m">{d.method}</span> : null}</span>
                          </button>
                        ) : <div className="vc-pname">{d.title}{d.method ? <span className="m">{d.method}</span> : null}</div>}</td>
                        <td><span className="tag">{d.kind === "automatic" ? "Tự động" : "Mã"}</span></td>
                        <td><span className={`pill ${d.status === "ACTIVE" ? "on" : "off"}`}>{d.status === "ACTIVE" && <span className="dotp" />}{discountStatusLabel(d.status)}</span></td>
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
        {!data
          ? "Đang xác định nguồn dữ liệu…"
          : <>Dữ liệu HUSSIO <b>{data.source === "snapshot" ? "snapshot" : "Shopify realtime"}</b>{data.updatedAt ? ` · cập nhật ${data.updatedAt}` : ""}.</>}
      </footer>

      {/* ===== Modal xem / tải QR 1 mã ===== */}
      {qrRow && (
        <div className="vc-ov" onClick={() => setQrRow(null)}>
          <div
            ref={qrDialogRef}
            className="vc-qrmodal"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={trapModalFocus}
            role="dialog"
            aria-modal="true"
            aria-label={`Mã QR ${qrRow.code}`}
          >
            <button ref={qrCloseRef} className="vc-qrx" onClick={() => setQrRow(null)} aria-label="Đóng"><IClose /></button>
            <div className="vc-qrbig"><QrCode text={voucherLink(data?.publicDomain, qrRow.code)} size={220} margin={2} /></div>
            <div className="vc-qrcode mono">{qrRow.code}</div>
            <div className="vc-qrlink">{voucherLink(data?.publicDomain, qrRow.code)}</div>
            <div className="vc-qracts">
              <button className="vc-btn" onClick={() => downloadQrPng(voucherLink(data?.publicDomain, qrRow.code), `HUSSIO_QR_${qrRow.code}.png`)}>
                <IDownload /> Tải PNG
              </button>
              <button className="vc-btn" onClick={() => copyLink(qrRow.code)}>
                <ICopy /> {copied ? "Đã sao chép!" : "Sao chép link"}
              </button>
              <a className="vc-btn ghost" href={voucherLink(data?.publicDomain, qrRow.code)} target="_blank" rel="noopener noreferrer">Mở link</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
