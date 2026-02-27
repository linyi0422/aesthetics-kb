import Image from "next/image";
import Link from "next/link";
import { getDb } from "@/server/db";
import { requireUser } from "@/server/require-user";
import { parseJsonStringArray } from "@/server/json-safe";
import Watermark from "@/app/_components/Watermark";

export const revalidate = 3600;

type SearchParams = { q?: string };

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const db = getDb();
  const results = query
    ? (db
        .prepare(
          `SELECT slug, title, cover_url, tags_json
           FROM entries
           WHERE status = 'published'
             AND (title LIKE ? OR tags_json LIKE ? OR takeaways_json LIKE ?)
           ORDER BY updated_at DESC
           LIMIT 100`,
        )
        .all(`%${query}%`, `%${query}%`, `%${query}%`) as Array<{
        slug: string;
        title: string;
        cover_url: string | null;
        tags_json: string;
      }>)
    : [];

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">搜索</h1>
      <form className="mt-6 flex gap-2" action="/search">
        <input
          name="q"
          defaultValue={query}
          className="w-full rounded border p-2"
          placeholder="输入关键词（标题/标签/拆解）"
        />
        <button className="rounded bg-black px-4 py-2 text-white" type="submit">
          搜索
        </button>
      </form>

      {query ? (
        <p className="mt-4 text-sm opacity-80">
          结果：{results.length} 条（关键词：<span className="font-mono">{query}</span>）
        </p>
      ) : (
        <p className="mt-4 text-sm opacity-80">从条目里搜标题、标签与拆解内容。</p>
      )}

      <div className="mt-6 space-y-3">
        {results.map((result) => {
          const tags = parseJsonStringArray(result.tags_json).slice(0, 6);
          return (
            <Link key={result.slug} href={`/e/${result.slug}`} className="block rounded border p-3 hover:bg-zinc-50">
              <div className="flex items-center gap-3">
                {result.cover_url ? (
                  <Image
                    className="h-12 w-12 rounded object-cover"
                    src={result.cover_url}
                    alt=""
                    width={96}
                    height={96}
                    sizes="48px"
                  />
                ) : (
                  <div className="h-12 w-12 rounded bg-zinc-100" />
                )}
                <div className="min-w-0">
                  <div className="truncate font-medium">{result.title}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {tags.map((tag) => (
                      <span key={tag} className="rounded bg-zinc-100 px-2 py-0.5 text-[11px]">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <Watermark user={user} />
    </main>
  );
}
