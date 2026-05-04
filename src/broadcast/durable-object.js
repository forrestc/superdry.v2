import { formatSseFrame, sseHeaders } from "./sse.js";

const encoder = new TextEncoder();
const jsonHeaders = { "content-type": "application/json; charset=utf-8" };

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

const readJson = async (request) => {
  try {
    return await request.json();
  } catch {
    return null;
  }
};

export class SuperdryBroadcastDurableObject {
  constructor() {
    this.channels = new Map();
  }

  ensureChannel(name) {
    if (!this.channels.has(name)) {
      this.channels.set(name, new Set());
    }
    return this.channels.get(name);
  }

  removeSubscriber(subscribers, subscriber) {
    subscribers.delete(subscriber);
  }

  publish({ channel, event, data, senderId }) {
    const subscribers = this.channels.get(channel);
    if (!subscribers?.size) return;

    const payload = encoder.encode(formatSseFrame({ event, data }));
    for (const subscriber of subscribers) {
      if (senderId && subscriber.clientId === senderId) continue;
      try {
        subscriber.controller.enqueue(payload);
      } catch {
        this.removeSubscriber(subscribers, subscriber);
      }
    }
  }

  subscribe({ channel, clientId }) {
    const subscribers = this.ensureChannel(channel);
    const subscriber = { clientId, controller: null };

    const stream = new ReadableStream({
      start: (controller) => {
        subscriber.controller = controller;
        subscribers.add(subscriber);
        controller.enqueue(
          encoder.encode(formatSseFrame({
            event: "connected",
            data: { channel },
          })),
        );
      },
      cancel: () => {
        this.removeSubscriber(subscribers, subscriber);
      },
    });

    return new Response(stream, { headers: sseHeaders() });
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/publish") {
      const body = await readJson(request);
      if (!body?.channel || !body?.event) {
        return jsonResponse({ ok: false, error: "invalid broadcast payload" }, 400);
      }
      this.publish({
        channel: String(body.channel),
        event: String(body.event),
        data: body.data,
        senderId: body.senderId ? String(body.senderId) : undefined,
      });
      return jsonResponse({ ok: true });
    }

    if (request.method === "GET" && url.pathname === "/subscribe") {
      return this.subscribe({
        channel: String(url.searchParams.get("channel") ?? "superdry"),
        clientId: url.searchParams.get("clientId") ?? undefined,
      });
    }

    return jsonResponse({ ok: false, error: "not found" }, 404);
  }
}
