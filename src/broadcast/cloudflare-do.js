const jsonHeaders = { "content-type": "application/json; charset=utf-8" };

const createDoStub = (env, bindingName, objectName) => {
  const namespace = env?.[bindingName];
  if (!namespace) {
    throw new Error(`Missing Durable Object binding "${bindingName}"`);
  }
  const id = namespace.idFromName(objectName);
  return namespace.get(id);
};

export const createCloudflareDoBroadcastAdapter = (options = {}) => {
  const {
    bindingName = "SUPERDRY_BROADCAST",
    objectName = "superdry-broadcast",
  } = options;

  return {
    async publish({ env, channel, event, data, senderId }) {
      const stub = createDoStub(env, bindingName, objectName);
      const response = await stub.fetch("https://superdry-broadcast/publish", {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({ channel, event, data, senderId }),
      });
      if (!response.ok) {
        throw new Error(`Durable Object broadcast publish failed (${response.status})`);
      }
    },

    async subscribe({ env, channel, clientId }) {
      const stub = createDoStub(env, bindingName, objectName);
      const url = new URL("https://superdry-broadcast/subscribe");
      url.searchParams.set("channel", channel);
      if (clientId) url.searchParams.set("clientId", clientId);
      return stub.fetch(url);
    },
  };
};
