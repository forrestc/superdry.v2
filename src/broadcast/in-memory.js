import { formatSseFrame, sseHeaders } from "./sse.js";

const encoder = new TextEncoder();
const HEARTBEAT_MS = 25000;

export const createInMemoryBroadcastAdapter = () => {
  const channels = new Map();

  const ensureChannel = (name) => {
    if (!channels.has(name)) {
      channels.set(name, new Set());
    }
    return channels.get(name);
  };

  const removeSubscriber = (subscribers, subscriber) => {
    clearInterval(subscriber.heartbeatId);
    subscribers.delete(subscriber);
  };

  return {
    async publish({ channel, event, data, senderId }) {
      const subscribers = channels.get(channel);
      if (!subscribers?.size) return;

      const payload = encoder.encode(formatSseFrame({ event, data }));
      for (const subscriber of subscribers) {
        if (senderId && subscriber.clientId === senderId) continue;
        try {
          subscriber.controller.enqueue(payload);
        } catch {
          removeSubscriber(subscribers, subscriber);
        }
      }
    },

    async subscribe({ channel, clientId }) {
      const subscribers = ensureChannel(channel);
      const subscriber = { clientId, controller: null, heartbeatId: null };

      const stream = new ReadableStream({
        start(controller) {
          subscriber.controller = controller;
          subscribers.add(subscriber);
          controller.enqueue(
            encoder.encode(formatSseFrame({
              event: "connected",
              data: { channel },
            })),
          );
          subscriber.heartbeatId = setInterval(() => {
            try {
              controller.enqueue(encoder.encode(": ping\n\n"));
            } catch {
              removeSubscriber(subscribers, subscriber);
            }
          }, HEARTBEAT_MS);
        },
        cancel() {
          removeSubscriber(subscribers, subscriber);
        },
      });

      return new Response(stream, { headers: sseHeaders() });
    },
  };
};
