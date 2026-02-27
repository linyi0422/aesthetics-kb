import Image from "next/image";
import Link from "next/link";
import { getDb } from "@/server/db";
import { requireUser } from "@/server/require-user";
import { parseJsonStringArray } from "@/server/json-safe";
import Watermark from "@/app/_components/Watermark";
import LensEntries from "@/app/l/_components/LensEntries";

export const revalidate = 3600;

type Params = { slug: string };

export default async function LensDetailPage({ params }: { params: Promise<Params> }) {
  const user = await requireUser();
  const { slug } = await params;
  const db = getDb();

  const lens = db
    .prepare(
      "SELECT id, title, statement, intro, cover_url FROM lenses WHERE slug = ? AND status = 'published' LIMIT 1",
    )
    .get(slug) as
    | { id: string; title: string; statement: string; intro: string; cover_url: string | null }
    | undefined;

  if (!lens) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <p className="text-sm opacity-80">未找到镜片。</p>
        <p className="mt-4 text-sm">
          <Link className="underline" href="/lenses">
            返回镜片列表
          </Link>
        </p>
        <Watermark user={user} />
      </main>
    );
  }

  const rows = db
    .prepare(
      `SELECT e.slug, e.title, e.cover_url, e.tags_json
       FROM entries e
       JOIN lens_entries le ON le.entry_id = e.id
       WHERE le.lens_id = ? AND e.status = 'published'
       ORDER BY e.updated_at DESC`,
    )
    .all(lens.id) as Array<{ slug: string; title: string; cover_url: string | null; tags_json: string }>;

  const entries = rows.map((row) => ({
    slug: row.slug,
    title: row.title,
    coverUrl: row.cover_url,
    tags: parseJsonStringArray(row.tags_json),
  }));

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="flex flex-col gap-6 sm:flex-row">
        {lens.cover_url ? (
          <Image
            className="h-48 w-full rounded object-cover sm:h-56 sm:w-72"
            src={lens.cover_url}
            alt=""
            width={720}
            height={448}
            sizes="(min-width: 640px) 288px, 100vw"
          />
        ) : (
          <div className="h-48 w-full rounded bg-zinc-100 sm:h-56 sm:w-72" />
        )}
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold">{lens.title}</h1>
          {lens.statement ? <p className="mt-2 text-sm opacity-80">{lens.statement}</p> : null}
          {lens.intro ? <p className="mt-4 text-sm leading-7 opacity-90">{lens.intro}</p> : null}
        </div>
      </div>

      <div className="mt-10">
        <LensEntries entries={entries} />
      </div>

      <Watermark user={user} />
    </main>
  );
}
