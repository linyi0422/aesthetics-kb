import { sha256Hex } from "@/server/auth";
import type { SessionUser } from "@/server/session";

export default function Watermark({ user }: { user: SessionUser }) {
  const stamp = `${sha256Hex(user.email).slice(0, 8)} · ${new Date().toISOString().slice(0, 10)}`;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-50 flex justify-center">
      <div className="rounded-full border bg-white/70 px-3 py-1 text-xs opacity-80 backdrop-blur">
        {stamp}
      </div>
    </div>
  );
}
