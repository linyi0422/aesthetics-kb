"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ui] Global error boundary triggered", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <html lang="zh-Hans">
      <body>
        <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center p-6 text-center">
          <h1 className="text-2xl font-semibold">页面发生错误</h1>
          <p className="mt-3 text-sm opacity-80">请重试；如果仍失败，稍后再访问。</p>
          <button className="mt-6 rounded border px-4 py-2" onClick={reset} type="button">
            重试
          </button>
        </main>
      </body>
    </html>
  );
}

