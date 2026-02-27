# 审美镜片库（Lens-first）

Notion 负责内容编辑；本站负责付费交付、权限与浏览体验（镜片为主入口）。

## 本地启动

```bash
cd aesthetics-kb
npm install
cp .env.example .env
npm run dev
```

访问 `http://localhost:3000`。

## 环境变量

在 `.env` 里配置：

- `DATABASE_URL`：默认 `file:./dev.db`（本地 SQLite 文件）
- `ADMIN_TOKEN`：后台接口鉴权（请求头 `x-admin-token`）
- `NOTION_TOKEN`：Notion integration token（用于同步）
- `NOTION_LENSES_DB_ID`：Notion 的 data source id（镜片库）
- `NOTION_ENTRIES_DB_ID`：Notion 的 data source id（条目库）

## 管理后台（MVP）

- `http://localhost:3000/admin/codes`：生成一次性兑换码（返回明文，数据库只存 hash）
- `http://localhost:3000/admin/sync`：从 Notion 拉取 `Status=Published` 的内容写入本地库

## 用户流程（MVP）

1. 用户在小红书成交后拿到兑换码
2. 用户访问 `/redeem`，输入兑换码 + 邮箱
3. 开通成功后获得 session cookie，可访问 `/lenses`、`/l/<slug>`、`/e/<slug>`、`/search`

## 备注

当前 DB 层使用 Node 24 的内置 `node:sqlite`（实验特性），优先保证无原生依赖、能快速推进；后续要上线可替换为 Postgres/成熟 ORM。

