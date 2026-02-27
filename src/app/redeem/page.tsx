"use client";

import { useState } from "react";

export default function RedeemPage() {
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");

    const response = await fetch("/api/redeem", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code, email }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      setStatus(data.error ?? "error");
      return;
    }

    setStatus("ok");
    window.location.href = "/lenses";
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold">兑换开通</h1>
      <p className="mt-2 text-sm opacity-80">输入兑换码与邮箱，即可开通访问权限。</p>

      <form className="mt-6 space-y-3" onSubmit={onSubmit}>
        <div>
          <label className="mb-1 block text-sm" htmlFor="redeem-code">
            兑换码
          </label>
          <input
            id="redeem-code"
            className="w-full rounded border p-2"
            placeholder="兑换码"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            autoComplete="off"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm" htmlFor="redeem-email">
            邮箱
          </label>
          <input
            id="redeem-email"
            className="w-full rounded border p-2"
            placeholder="邮箱"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            type="email"
          />
        </div>

        <button
          className="w-full rounded bg-black px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={status === "loading"}
        >
          {status === "loading" ? "兑换中..." : "立即开通"}
        </button>
      </form>

      {status && <p className="mt-4 text-sm opacity-80">状态：{status}</p>}
    </main>
  );
}
