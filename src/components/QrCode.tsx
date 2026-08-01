"use client";

import { useMemo } from "react";
import qrcode from "qrcode-generator";

// ===== Tạo mã QR cho link áp voucher =====
// Dùng thư viện qrcode-generator (thuần JS, không phụ thuộc) — tạo QR ngay tại
// máy, không gửi link ra dịch vụ ngoài. QR luôn vẽ đen trên nền trắng để quét được.

// Tạo ma trận đen/trắng cho 1 chuỗi. ECC mức "M" đủ bền, tự chọn version.
export function qrMatrix(text: string): boolean[][] {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const m: boolean[][] = [];
  for (let r = 0; r < n; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < n; c++) row.push(qr.isDark(r, c));
    m.push(row);
  }
  return m;
}

// Dựng chuỗi markup <svg> (dùng cho trang in nhiều QR).
export function qrSvgMarkup(text: string, cell = 6, margin = 4): string {
  const m = qrMatrix(text);
  const n = m.length;
  const dim = (n + margin * 2) * cell;
  let rects = "";
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (m[r][c])
        rects += `<rect x="${(c + margin) * cell}" y="${(r + margin) * cell}" width="${cell}" height="${cell}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${dim}" height="${dim}" viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges"><rect width="${dim}" height="${dim}" fill="#fff"/><g fill="#000">${rects}</g></svg>`;
}

// Tải QR ra file PNG (vẽ bằng canvas, chạy phía trình duyệt).
export function downloadQrPng(text: string, filename: string, scale = 14, margin = 4) {
  const m = qrMatrix(text);
  const n = m.length;
  const size = (n + margin * 2) * scale;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#000000";
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (m[r][c])
        ctx.fillRect((c + margin) * scale, (r + margin) * scale, scale, scale);
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// Render QR ra SVG nét căng (nền trắng để luôn quét được kể cả giao diện tối).
export default function QrCode({
  text,
  size = 44,
  margin = 2,
  className,
  label,
}: {
  text: string;
  size?: number;
  margin?: number;
  className?: string;
  label?: string;
}) {
  const path = useMemo(() => {
    const m = qrMatrix(text);
    const n = m.length;
    let d = "";
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++)
        if (m[r][c]) d += `M${c + margin} ${r + margin}h1v1h-1z`;
    return { d, dim: n + margin * 2 };
  }, [text, margin]);

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox={`0 0 ${path.dim} ${path.dim}`}
      role="img"
      aria-label={label || "Mã QR"}
      shapeRendering="crispEdges"
    >
      <rect width={path.dim} height={path.dim} fill="#fff" />
      <path d={path.d} fill="#000" />
    </svg>
  );
}
