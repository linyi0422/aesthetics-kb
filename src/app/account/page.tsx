import { getDb } from "@/server/db";
import { requireUser } from "@/server/require-user";
import Watermark from "@/app/_components/Watermark";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireUser();
  const db = getDb();

  const entitlement = db
    .prepare(
      "SELECT kind, value, starts_at, ends_at FROM entitlements WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
    )
    .get(user.id) as
    | { kind: string; value: string | null; starts_at: string; ends_at: string | null }
    | undefined;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">账号</h1>
      <div className="mt-6 rounded border p-4">
        <div className="text-sm opacity-70">邮箱</div>
        <div className="mt-1 text-base">{user.email}</div>

        <div className="mt-4 text-sm opacity-70">权限</div>
        <div className="mt-1 text-base">{entitlement?.kind ?? "none"}</div>

        <div className="mt-4 text-sm opacity-70">开通时间</div>
        <div className="mt-1 text-base">{entitlement?.starts_at ?? "-"}</div>

        <div className="mt-4 text-sm opacity-70">到期时间</div>
        <div className="mt-1 text-base">{entitlement?.ends_at ?? "无"}</div>
      </div>

      <form className="mt-6" action="/api/logout" method="post">
        <button className="rounded border px-4 py-2" type="submit">
          退出登录
        </button>
      </form>

      <Watermark user={user} />
    </main>
  );
}
