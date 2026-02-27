export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center p-6">
      <h1 className="text-4xl font-semibold tracking-tight">审美镜片库</h1>
      <p className="mt-4 max-w-2xl text-base leading-7 opacity-80">
        用镜片（主题合集）来逛审美，用条目卡片来拆解画面。Notion 负责编辑，你的会员站负责交付与权限。
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <a className="rounded bg-black px-4 py-2 text-white" href="/redeem">
          兑换开通
        </a>
        <a className="rounded border px-4 py-2" href="/lenses">
          进入镜片
        </a>
      </div>
    </main>
  );
}
