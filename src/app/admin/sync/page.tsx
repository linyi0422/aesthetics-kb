"use client";

import { useState } from "react";

export default function AdminSyncPage() {
  const [adminToken, setAdminToken] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [result, setResult] = useState("");

  async function runSync() {
    setStatus("loading");
    setResult("");

    const response = await fetch("/api/admin/sync", {
      method: "POST",
      headers: { "x-admin-token": adminToken },
    });

    setResult(await response.text());
    setStatus(response.ok ? "ok" : "error");
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold">Notion 同步</h1>
      <p className="mt-2 text-sm opacity-80">从 Notion 拉取已发布内容并写入本地数据库。</p>

      <div className="mt-6 space-y-3">
        <div>
          <label className="mb-1 block text-sm" htmlFor="sync-admin-token">
            ADMIN_TOKEN
          </label>
          <input
            id="sync-admin-token"
            className="w-full rounded border p-2"
            placeholder="请求头 x-admin-token"
            value={adminToken}
            onChange={(event) => setAdminToken(event.target.value)}
          />
        </div>

        <button className="rounded bg-black px-4 py-2 text-white" type="button" onClick={runSync}>
          立即同步
        </button>

        {status && <p className="text-sm opacity-80">状态：{status}</p>}
        <pre className="max-h-80 overflow-auto rounded border bg-zinc-50 p-3 text-xs">{result}</pre>
      </div>
    </main>
  );
}
