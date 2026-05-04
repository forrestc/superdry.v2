export const BROADCAST_PATH = "/_superdry/broadcast";
export const DEFAULT_BROADCAST_CHANNEL = "superdry";

const createBroadcastStorage = () => {
  if (typeof globalThis.AsyncLocalStorage === "function") {
    return new globalThis.AsyncLocalStorage();
  }

  let current;
  return {
    getStore: () => current,
    async run(context, fn) {
      const previous = current;
      current = context;
      try {
        return await fn();
      } finally {
        current = previous;
      }
    },
  };
};

const broadcastStorage = createBroadcastStorage();

const normalizeChannel = (channel) =>
  String(channel ?? DEFAULT_BROADCAST_CHANNEL);

const normalizeEvent = (event) => String(event ?? "message");

const toJsonValue = (value) => {
  if (value === undefined) return null;
  return value;
};

export const createBroadcastContext = (input = {}) => ({
  adapter: input.adapter,
  channel: normalizeChannel(input.channel),
  clientId: input.clientId,
  env: input.env,
  pending: [],
});

export const runWithBroadcastContext = (context, fn) =>
  broadcastStorage.run(context, fn);

export const getBroadcastContext = () => broadcastStorage.getStore();

export const broadcast = (event, data, options = {}) => {
  const context = getBroadcastContext();
  if (!context) return;

  context.pending.push({
    event: normalizeEvent(event),
    data: toJsonValue(data),
    channel: options.channel ? normalizeChannel(options.channel) : undefined,
  });
};

export const createBroadcast = (adapter, defaults = {}) => ({
  async publish(input = {}) {
    if (typeof adapter?.publish !== "function") return;
    const channel = normalizeChannel(input.channel ?? defaults.channel);
    const event = normalizeEvent(input.event);
    await adapter.publish({
      ...input,
      env: input.env ?? defaults.env,
      channel,
      event,
      senderId: input.senderId ?? defaults.clientId,
    });
  },

  async subscribe(input = {}) {
    if (typeof adapter?.subscribe !== "function") {
      return new Response("Broadcast adapter is not configured", {
        status: 501,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
    const channel = normalizeChannel(input.channel ?? defaults.channel);
    return adapter.subscribe({
      ...input,
      env: input.env ?? defaults.env,
      channel,
      clientId: input.clientId ?? defaults.clientId,
    });
  },
});

export const publishQueuedBroadcasts = async (context, streamHtml) => {
  if (!context?.pending?.length) return;
  if (typeof context.adapter?.publish !== "function") return;

  const queued = context.pending.splice(0);
  for (const item of queued) {
    await context.adapter.publish({
      env: context.env,
      channel: normalizeChannel(item.channel ?? context.channel),
      event: "superdry:broadcast",
      senderId: context.clientId,
      data: {
        event: item.event,
        payload: item.data,
      },
    });
  }
};
