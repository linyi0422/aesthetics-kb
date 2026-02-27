"use client";

import { useMemo, useState } from "react";

export default function AdminCodesPage() {
  const [adminToken, setAdminToken] = useState("");
  const [count, setCount] = useState(10);
  const [expiresAt, setExpiresAt] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [codes, setCodes] = useState<string[]>([]);

  const output = useMemo(() => codes.join("\n"), [codes]);

  async function generate() {
    setStatus("loading");
    setCodes([]);

    const response = await fetch("/api/admin/codes", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-admin-token": adminToken,
      },
      body: JSON.stringify({
        count,
        expiresAt: expiresAt.trim() ? new Date(expiresAt).toISOString() : null,
      }),
    });

    const data = (await response.json().catch(() => ({}))) as { error?: string; codes?: string[] };
    if (!response.ok) {
      setStatus(data.error ?? "error");
      return;
    }

    setCodes(Array.isArray(data.codes) ? data.codes : []);
    setStatus("ok");
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold">生成兑换码</h1>
      <p className="mt-2 text-sm opacity-80">
        返回一次性明文兑换码（数据库只存 hash），可用于小红书数字商品交付。
      </p>

      <div className="mt-6 space-y-3">
        <div>
          <label className="mb-1 block text-sm" htmlFor="admin-token">
            ADMIN_TOKEN
          </label>
          <input
            id="admin-token"
            className="w-full rounded border p-2"
            placeholder="请求头 x-admin-token"
            value={adminToken}
            onChange={(event) => setAdminToken(event.target.value)}
          />
        </div>

        <div className="flex gap-3">
          <div className="w-full">
            <label className="mb-1 block text-sm" htmlFor="code-count">
              数量
            </label>
            <input
              id="code-count"
              className="w-full rounded border p-2"
              type="number"
              min={1}
              max={500}
              value={count}
              onChange={(event) => setCount(Number(event.target.value))}
            />
          </div>

          <div className="w-full">
            <label className="mb-1 block text-sm" htmlFor="code-expiry">
              过期时间（可选）
            </label>
            <input
              id="code-expiry"
              className="w-full rounded border p-2"
              placeholder="2026-12-31"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
            />
          </div>
        </div>

        <button className="rounded bg-black px-4 py-2 text-white" onClick={generate} type="button">
          生成
        </button>

        {status && <p className="text-sm opacity-80">状态：{status}</p>}
        <textarea className="h-64 w-full rounded border p-2 font-mono text-sm" readOnly value={output} />
      </div>
    </main>
  );
}
