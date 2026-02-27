import Image from "next/image";
import Link from "next/link";
import { getDb } from "@/server/db";
import { requireUser } from "@/server/require-user";
import { parseJsonStringArray } from "@/server/json-safe";
import Watermark from "@/app/_components/Watermark";

export const revalidate = 3600;

type Params = { slug: string };

export default async function EntryDetailPage({ params }: { params: Promise<Params> }) {
  const user = await requireUser();
  const { slug } = await params;
  const db = getDb();

  const row = db
    .prepare(
      "SELECT id, title, cover_url, images_json, takeaways_json, tags_json FROM entries WHERE slug = ? AND status = 'published' LIMIT 1",
    )
    .get(slug) as
    | {
        id: string;
        title: string;
        cover_url: string | null;
        images_json: string;
        takeaways_json: string;
        tags_json: string;
      }
    | undefined;

  if (!row) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <p className="text-sm opacity-80">未找到条目。</p>
        <p className="mt-4 text-sm">
          <Link className="underline" href="/lenses">
            返回镜片列表
          </Link>
        </p>
        <Watermark user={user} />
      </main>
    );
  }

  const images = parseJsonStringArray(row.images_json);
  const takeaways = parseJsonStringArray(row.takeaways_json);
  const tags = parseJsonStringArray(row.tags_json);

  const lensRows = db
    .prepare(
      `SELECT l.slug, l.title
       FROM lenses l
       JOIN lens_entries le ON le.lens_id = l.id
       WHERE le.entry_id = ? AND l.status = 'published'
       ORDER BY l.order_int ASC, l.updated_at DESC`,
    )
    .all(row.id) as Array<{ slug: string; title: string }>;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <p className="text-sm">
        <Link className="underline" href="/lenses">
          镜片
        </Link>
      </p>
      <h1 className="mt-4 text-3xl font-semibold">{row.title}</h1>

      <div className="mt-4 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span key={tag} className="rounded-full border px-3 py-1 text-xs">
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-8 space-y-3">
        {images.map((url, index) => (
          <Image
            key={index}
            className="h-auto w-full rounded border"
            src={url}
            alt={`${row.title} 图片 ${index + 1}`}
            width={1600}
            height={1200}
            sizes="(min-width: 768px) 768px, 100vw"
          />
        ))}
      </div>

      {takeaways.length ? (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">拆解要点</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7">
            {takeaways.map((takeaway, index) => (
              <li key={index}>{takeaway}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {lensRows.length ? (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">所属镜片</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {lensRows.map((lens) => (
              <Link key={lens.slug} className="rounded border px-3 py-1 text-sm hover:bg-zinc-50" href={`/l/${lens.slug}`}>
                {lens.title}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <Watermark user={user} />
    </main>
  );
}
