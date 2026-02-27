import Image from "next/image";
import Link from "next/link";
import { getDb } from "@/server/db";
import { requireUser } from "@/server/require-user";
import Watermark from "@/app/_components/Watermark";

export const revalidate = 3600;

export default async function LensesPage() {
  const user = await requireUser();
  const db = getDb();
  const lenses = db
    .prepare(
      "SELECT slug, title, statement, cover_url FROM lenses WHERE status = 'published' ORDER BY order_int ASC, updated_at DESC",
    )
    .all() as Array<{ slug: string; title: string; statement: string; cover_url: string | null }>;

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">镜片</h1>
        <div className="flex items-center gap-3 text-sm">
          <Link className="underline" href="/search">
            搜索
          </Link>
          <Link className="underline" href="/account">
            账号
          </Link>
          <form action="/api/logout" method="post">
            <button className="underline" type="submit">
              退出
            </button>
          </form>
        </div>
      </div>
      <p className="mt-3 text-sm opacity-80">从主题镜片开始逛，每个镜片是一套审美语言与案例卡片。</p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lenses.map((lens) => (
          <Link key={lens.slug} href={`/l/${lens.slug}`} className="group rounded border p-4">
            {lens.cover_url ? (
              <Image
                className="h-40 w-full rounded object-cover"
                src={lens.cover_url}
                alt=""
                width={640}
                height={360}
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              />
            ) : (
              <div className="h-40 w-full rounded bg-zinc-100" />
            )}
            <div className="mt-3 font-medium group-hover:underline">{lens.title}</div>
            {lens.statement ? <div className="mt-1 text-sm opacity-80">{lens.statement}</div> : null}
          </Link>
        ))}
      </div>

      <Watermark user={user} />
    </main>
  );
}
