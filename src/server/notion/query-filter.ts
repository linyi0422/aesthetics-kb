export type LastEditedFilter = {
  timestamp: "last_edited_time";
  last_edited_time: { after: string };
};

export function buildLastEditedFilter(lastSyncAt: string | null): LastEditedFilter | undefined {
  if (!lastSyncAt) return undefined;
  return {
    timestamp: "last_edited_time",
    last_edited_time: { after: lastSyncAt },
  };
}

