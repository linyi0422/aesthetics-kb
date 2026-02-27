import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const IMAGE_DIR = path.join(process.cwd(), "public", "images");
const SAFE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "svg", "avif"]);

function normalizeExtension(rawUrl: string): string {
  try {
    const pathname = new URL(rawUrl).pathname;
    const ext = pathname.split(".").pop()?.toLowerCase() ?? "jpg";
    if (!SAFE_EXTENSIONS.has(ext)) return "jpg";
    return ext;
  } catch {
    return "jpg";
  }
}

export async function downloadImage(rawUrl: string): Promise<string> {
  if (!rawUrl) return rawUrl;
  if (rawUrl.startsWith("/images/")) return rawUrl;
  if (rawUrl.startsWith("/")) return rawUrl;

  const stableSource = rawUrl.split("?")[0] ?? rawUrl;
  const ext = normalizeExtension(rawUrl);
  const hash = crypto.createHash("sha256").update(stableSource).digest("hex").slice(0, 16);
  const filename = `${hash}.${ext}`;
  const filepath = path.join(IMAGE_DIR, filename);

  fs.mkdirSync(IMAGE_DIR, { recursive: true });
  if (fs.existsSync(filepath)) return `/images/${filename}`;

  const res = await fetch(rawUrl, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`image_download_failed_${res.status}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(filepath, buffer);
  return `/images/${filename}`;
}

