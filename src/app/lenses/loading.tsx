export default function LensesLoading() {
  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="h-8 w-40 animate-pulse rounded bg-zinc-200" />
      <div className="mt-4 h-4 w-72 animate-pulse rounded bg-zinc-200" />
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="rounded border p-4">
            <div className="h-40 w-full animate-pulse rounded bg-zinc-200" />
            <div className="mt-3 h-4 w-24 animate-pulse rounded bg-zinc-200" />
            <div className="mt-2 h-3 w-32 animate-pulse rounded bg-zinc-200" />
          </div>
        ))}
      </div>
    </main>
  );
}

