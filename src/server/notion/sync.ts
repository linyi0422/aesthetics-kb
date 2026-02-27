import type { DatabaseSync } from "node:sqlite";
import { notion } from "@/server/notion/client";
import { getDb, newId } from "@/server/db";
import { downloadImage } from "@/server/notion/download-image";
import { buildLastEditedFilter } from "@/server/notion/query-filter";
import { withRetry } from "@/server/notion/retry";

type NotionProperty = Record<string, unknown>;

type NotionPage = {
  id: string;
  properties: Record<string, NotionProperty>;
};

type SyncedLens = {
  notionId: string;
  slug: string;
  title: string;
  statement: string;
  intro: string;
  coverUrl: string | null;
  order: number;
  status: "published" | "draft";
};

type SyncedEntry = {
  notionId: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  images: string[];
  takeaways: string[];
  tags: string[];
  status: "published" | "draft";
  lensNotionIds: string[];
};

type QueryResult = {
  results?: unknown[];
  has_more?: boolean;
  next_cursor?: string | null;
};

type SyncStateRow = {
  last_sync_at: string | null;
};

function plainTextFromRichText(items: Array<{ plain_text?: string }> | undefined): string {
  if (!items || !Array.isArray(items)) return "";
  return items.map((item) => item.plain_text ?? "").join("");
}

function getProp(props: Record<string, NotionProperty>, name: string): NotionProperty | null {
  return Object.prototype.hasOwnProperty.call(props, name) ? props[name] : null;
}

function getTypeProp<T>(prop: NotionProperty | null, type: string, key: string): T | null {
  if (!prop || prop.type !== type) return null;
  return (prop[key] as T | undefined) ?? null;
}

function getTitle(props: Record<string, NotionProperty>, name: string): string {
  return plainTextFromRichText(getTypeProp<Array<{ plain_text?: string }>>(getProp(props, name), "title", "title") ?? undefined);
}

function getRichText(props: Record<string, NotionProperty>, name: string): string {
  return plainTextFromRichText(
    getTypeProp<Array<{ plain_text?: string }>>(getProp(props, name), "rich_text", "rich_text") ?? undefined,
  );
}

function getSelect(props: Record<string, NotionProperty>, name: string): string | null {
  const select = getTypeProp<{ name?: string }>(getProp(props, name), "select", "select");
  return select?.name ?? null;
}

function getStatusOrSelect(props: Record<string, NotionProperty>, name: string): string | null {
  const selectName = getSelect(props, name);
  if (selectName) return selectName;
  const status = getTypeProp<{ name?: string }>(getProp(props, name), "status", "status");
  return status?.name ?? null;
}

function getMultiSelect(props: Record<string, NotionProperty>, name: string): string[] {
  const selected = getTypeProp<Array<{ name?: string }>>(getProp(props, name), "multi_select", "multi_select");
  if (!selected) return [];
  return selected.map((item) => String(item?.name ?? "")).filter(Boolean);
}

function getNumber(props: Record<string, NotionProperty>, name: string): number | null {
  const numberValue = getTypeProp<number>(getProp(props, name), "number", "number");
  return typeof numberValue === "number" ? numberValue : null;
}

function getText(props: Record<string, NotionProperty>, name: string): string {
  return getRichText(props, name) || getTitle(props, name);
}

function getFilesUrls(props: Record<string, NotionProperty>, name: string): string[] {
  const files = getTypeProp<Array<Record<string, unknown>>>(getProp(props, name), "files", "files");
  if (!files) return [];
  return files
    .map((file) => {
      if (file.type === "external") return ((file.external as { url?: string } | undefined)?.url ?? null) as string | null;
      if (file.type === "file") return ((file.file as { url?: string } | undefined)?.url ?? null) as string | null;
      return null;
    })
    .filter((url): url is string => Boolean(url));
}

function getRelationIds(props: Record<string, NotionProperty>, name: string): string[] {
  const relations = getTypeProp<Array<{ id?: string }>>(getProp(props, name), "relation", "relation");
  if (!relations) return [];
  return relations.map((rel) => String(rel?.id ?? "")).filter(Boolean);
}

function normalizeStatus(status: string | null): "published" | "draft" {
  if (!status) return "draft";
  return status.toLowerCase() === "published" ? "published" : "draft";
}

function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function getLastSyncAt(db: DatabaseSync): string | null {
  const row = db.prepare("SELECT last_sync_at FROM sync_state WHERE id = 1").get() as SyncStateRow | undefined;
  return row?.last_sync_at ?? null;
}

function updateLastSyncAt(db: DatabaseSync, timestamp: string) {
  db.prepare(
    `INSERT INTO sync_state (id, last_sync_at) VALUES (1, ?)
     ON CONFLICT(id) DO UPDATE SET last_sync_at = excluded.last_sync_at`,
  ).run(timestamp);
}

async function queryChangedPages(dataSourceId: string, lastSyncAt: string | null): Promise<NotionPage[]> {
  const pages: NotionPage[] = [];
  let cursor: string | undefined;
  const filter = buildLastEditedFilter(lastSyncAt);

  do {
    const query = {
      data_source_id: dataSourceId,
      start_cursor: cursor,
      page_size: 100,
      result_type: "page",
      ...(filter ? { filter } : {}),
    } as Parameters<typeof notion.dataSources.query>[0];

    const response = (await withRetry(() => notion.dataSources.query(query))) as QueryResult;

    for (const item of response.results ?? []) {
      if (!item || typeof item !== "object") continue;
      const page = item as NotionPage;
      if (!page.id || !page.properties) continue;
      pages.push(page);
    }

    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  return pages;
}

async function maybeDownloadImage(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    return await downloadImage(url);
  } catch (error) {
    console.error("[sync] Failed to download image", {
      url,
      error: error instanceof Error ? error.message : String(error),
    });
    return url;
  }
}

function markMissingAsDraft(db: DatabaseSync, table: "lenses" | "entries", notionIds: string[]) {
  if (notionIds.length === 0) {
    db.prepare(`UPDATE ${table} SET status = 'draft' WHERE notion_id IS NOT NULL`).run();
    return;
  }

  const placeholders = notionIds.map(() => "?").join(", ");
  db.prepare(`UPDATE ${table} SET status = 'draft' WHERE notion_id IS NOT NULL AND notion_id NOT IN (${placeholders})`).run(
    ...notionIds,
  );
}

export async function syncPublishedContent() {
  const lensesDbId = process.env.NOTION_LENSES_DB_ID ?? "";
  const entriesDbId = process.env.NOTION_ENTRIES_DB_ID ?? "";
  if (!process.env.NOTION_TOKEN) throw new Error("missing_notion_token");
  if (!lensesDbId) throw new Error("missing_lenses_db_id");
  if (!entriesDbId) throw new Error("missing_entries_db_id");

  const db = getDb();
  const lastSyncAt = getLastSyncAt(db);

  const [lensPages, entryPages] = await Promise.all([
    queryChangedPages(lensesDbId, lastSyncAt),
    queryChangedPages(entriesDbId, lastSyncAt),
  ]);

  const syncedLenses: SyncedLens[] = [];
  for (const page of lensPages) {
    const props = page.properties ?? {};
    const slug = getText(props, "Slug").trim();
    if (!slug) continue;

    const downloadedCoverUrl = await maybeDownloadImage(getFilesUrls(props, "Cover")[0] ?? null);
    syncedLenses.push({
      notionId: page.id,
      slug,
      title: getTitle(props, "Title") || getTitle(props, "Name") || "Untitled",
      statement: getText(props, "Statement").trim(),
      intro: getRichText(props, "Intro").trim(),
      coverUrl: downloadedCoverUrl,
      order: getNumber(props, "Order") ?? 0,
      status: normalizeStatus(getStatusOrSelect(props, "Status")),
    });
  }

  const syncedEntries: SyncedEntry[] = [];
  for (const page of entryPages) {
    const props = page.properties ?? {};
    const slug = getText(props, "Slug").trim();
    if (!slug) continue;

    const imageUrls = getFilesUrls(props, "Images");
    const downloadedImages: string[] = [];
    for (const imageUrl of imageUrls) {
      const localOrRemote = await maybeDownloadImage(imageUrl);
      if (localOrRemote) downloadedImages.push(localOrRemote);
    }

    syncedEntries.push({
      notionId: page.id,
      slug,
      title: getTitle(props, "Title") || getTitle(props, "Name") || "Untitled",
      coverUrl: await maybeDownloadImage(getFilesUrls(props, "Cover")[0] ?? null),
      images: downloadedImages,
      takeaways: splitLines(getText(props, "Takeaways")),
      tags: getMultiSelect(props, "Tags"),
      status: normalizeStatus(getStatusOrSelect(props, "Status")),
      lensNotionIds: getRelationIds(props, "Lenses"),
    });
  }

  const now = new Date().toISOString();
  const notionIdToLensId = new Map<string, string>();

  db.exec("BEGIN IMMEDIATE;");
  try {
    for (const lens of syncedLenses) {
      const existing = db.prepare("SELECT id FROM lenses WHERE notion_id = ?").get(lens.notionId) as { id: string } | undefined;
      const lensId = existing?.id ?? newId();
      notionIdToLensId.set(lens.notionId, lensId);

      if (existing) {
        db.prepare(
          "UPDATE lenses SET slug = ?, title = ?, statement = ?, intro = ?, cover_url = ?, order_int = ?, status = ?, updated_at = ? WHERE id = ?",
        ).run(lens.slug, lens.title, lens.statement, lens.intro, lens.coverUrl, lens.order, lens.status, now, lensId);
      } else {
        db.prepare(
          "INSERT INTO lenses (id, notion_id, slug, title, statement, intro, cover_url, order_int, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        ).run(
          lensId,
          lens.notionId,
          lens.slug,
          lens.title,
          lens.statement,
          lens.intro,
          lens.coverUrl,
          lens.order,
          lens.status,
          now,
          now,
        );
      }
    }

    const findLensIdByNotionId = db.prepare("SELECT id FROM lenses WHERE notion_id = ? LIMIT 1");

    for (const entry of syncedEntries) {
      const existing = db.prepare("SELECT id FROM entries WHERE notion_id = ?").get(entry.notionId) as { id: string } | undefined;
      const entryId = existing?.id ?? newId();

      if (existing) {
        db.prepare(
          "UPDATE entries SET slug = ?, title = ?, cover_url = ?, images_json = ?, takeaways_json = ?, tags_json = ?, status = ?, updated_at = ? WHERE id = ?",
        ).run(
          entry.slug,
          entry.title,
          entry.coverUrl,
          JSON.stringify(entry.images),
          JSON.stringify(entry.takeaways),
          JSON.stringify(entry.tags),
          entry.status,
          now,
          entryId,
        );
      } else {
        db.prepare(
          "INSERT INTO entries (id, notion_id, slug, title, cover_url, images_json, takeaways_json, tags_json, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        ).run(
          entryId,
          entry.notionId,
          entry.slug,
          entry.title,
          entry.coverUrl,
          JSON.stringify(entry.images),
          JSON.stringify(entry.takeaways),
          JSON.stringify(entry.tags),
          entry.status,
          now,
          now,
        );
      }

      db.prepare("DELETE FROM lens_entries WHERE entry_id = ?").run(entryId);
      const insertJoin = db.prepare("INSERT INTO lens_entries (lens_id, entry_id) VALUES (?, ?)");
      for (const lensNotionId of entry.lensNotionIds) {
        let lensId = notionIdToLensId.get(lensNotionId);
        if (!lensId) {
          const existingLens = findLensIdByNotionId.get(lensNotionId) as { id: string } | undefined;
          if (existingLens?.id) {
            lensId = existingLens.id;
            notionIdToLensId.set(lensNotionId, lensId);
          }
        }
        if (!lensId) continue;
        insertJoin.run(lensId, entryId);
      }
    }

    if (!lastSyncAt) {
      markMissingAsDraft(
        db,
        "lenses",
        syncedLenses.map((lens) => lens.notionId),
      );
      markMissingAsDraft(
        db,
        "entries",
        syncedEntries.map((entry) => entry.notionId),
      );
    }

    updateLastSyncAt(db, now);
    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    console.error("[sync] Failed", { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }

  return {
    ok: true,
    lenses: syncedLenses.length,
    entries: syncedEntries.length,
    updatedAt: now,
    incremental: Boolean(lastSyncAt),
    previousSyncAt: lastSyncAt,
  };
}
