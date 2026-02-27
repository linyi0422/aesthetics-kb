"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

type Entry = {
  slug: string;
  title: string;
  coverUrl: string | null;
  tags: string[];
};

export default function LensEntries({ entries }: { entries: Entry[] }) {
  const allTags = useMemo(() => {
    const s = new Set<string>();
    for (const e of entries) for (const t of e.tags) s.add(t);
    return Array.from(s).sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
  }, [entries]);

  const [tag, setTag] = useState<string>("");

  const filtered = useMemo(() => {
    if (!tag) return entries;
    return entries.filter((e) => e.tags.includes(tag));
  }, [entries, tag]);

  return (
    <section>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={`rounded-full border px-3 py-1 text-xs ${tag ? "" : "bg-black text-white"}`}
          onClick={() => setTag("")}
        >
          全部
        </button>
        {allTags.map((t) => (
          <button
            key={t}
            type="button"
            className={`rounded-full border px-3 py-1 text-xs ${tag === t ? "bg-black text-white" : ""}`}
            onClick={() => setTag(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((e) => (
          <Link key={e.slug} href={`/e/${e.slug}`} className="group rounded border p-3">
            <div className="flex items-center gap-3">
              {e.coverUrl ? (
                <Image className="h-14 w-14 rounded object-cover" src={e.coverUrl} alt="" width={112} height={112} sizes="56px" />
              ) : (
                <div className="h-14 w-14 rounded bg-zinc-100" />
              )}
              <div className="min-w-0">
                <div className="truncate font-medium group-hover:underline">{e.title}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {e.tags.slice(0, 4).map((t) => (
                    <span key={t} className="rounded bg-zinc-100 px-2 py-0.5 text-[11px]">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
