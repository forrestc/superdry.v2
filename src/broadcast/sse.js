export const sseHeaders = () => ({
  "content-type": "text/event-stream; charset=utf-8",
  "cache-control": "no-cache, no-transform",
  connection: "keep-alive",
});

export const stringifySseData = (data) => {
  if (typeof data === "string") return data;
  return JSON.stringify(data ?? null);
};

export const formatSseFrame = ({ event, data }) => {
  const lines = [`event: ${event}`];
  for (const line of stringifySseData(data).split(/\r?\n/)) {
    lines.push(`data: ${line}`);
  }
  return `${lines.join("\n")}\n\n`;
};
