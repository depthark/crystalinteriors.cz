/**
 * Read-only MCP server for AI agents (Cloudflare Pages Function).
 *
 *   POST /mcp   JSON-RPC 2.0, MCP "Streamable HTTP" transport, stateless,
 *               single JSON responses.
 *
 * Tools serve the same facts as the pages, read from the prerendered
 * /agent/site.json. Nothing here can write or send anything.
 */
interface Env {
  ASSETS: { fetch: (request: Request | string) => Promise<Response> };
}

interface Context {
  request: Request;
  env: Env;
}

type Facts = {
  services: unknown[];
  pricing: unknown;
  projects: unknown[];
  faq: { question: string; answer: string }[];
  process: unknown[];
  contact: unknown;
};

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

const SUPPORTED_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26"];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Mcp-Protocol-Version, Mcp-Session-Id",
};

const readOnly = { readOnlyHint: true, openWorldHint: false };
const noArgs = { type: "object", properties: {} };

const TOOLS = [
  {
    name: "get_services",
    title: "Služby",
    description: "Interior design services of Crystal Interiors (Brno, CZ): kitchens, bedrooms and wardrobes, bathrooms, living and kids' rooms, offices, hotels and restaurants.",
    inputSchema: noArgs,
    annotations: readOnly,
  },
  {
    name: "get_pricing",
    title: "Ceník",
    description: "Indicative prices in CZK for interior visualisations and consultations.",
    inputSchema: noArgs,
    annotations: readOnly,
  },
  {
    name: "list_projects",
    title: "Projekty",
    description: "Completed projects with title, subtitle, description and link.",
    inputSchema: noArgs,
    annotations: readOnly,
  },
  {
    name: "search_faq",
    title: "Časté dotazy",
    description: "Frequently asked questions (prices, free consultation, furniture production, meetings, commercial projects).",
    inputSchema: { type: "object", properties: { query: { type: "string" } } },
    annotations: readOnly,
  },
  {
    name: "get_contact",
    title: "Kontakt",
    description: "Showroom address, designers' phone numbers and e-mails, company ID, social profiles.",
    inputSchema: noArgs,
    annotations: readOnly,
  },
];

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS } });

const rpcResult = (id: JsonRpcRequest["id"], result: unknown) => ({ jsonrpc: "2.0", id, result });
const rpcError = (id: JsonRpcRequest["id"], code: number, message: string) => ({
  jsonrpc: "2.0",
  id: id ?? null,
  error: { code, message },
});

async function loadFacts(context: Context): Promise<Facts> {
  const url = new URL("/agent/site.json", context.request.url);
  const response = await context.env.ASSETS.fetch(url.toString());
  return (await response.json()) as Facts;
}

async function callTool(context: Context, name: string, args: Record<string, unknown>) {
  const data = await loadFacts(context);
  let payload: unknown;
  switch (name) {
    case "get_services":
      payload = data.services;
      break;
    case "get_pricing":
      payload = data.pricing;
      break;
    case "list_projects":
      payload = data.projects;
      break;
    case "search_faq": {
      const query = typeof args.query === "string" ? args.query.toLowerCase().trim() : "";
      const hits = query
        ? data.faq.filter((item) => `${item.question} ${item.answer}`.toLowerCase().includes(query))
        : data.faq;
      payload = hits.length ? hits : data.faq;
      break;
    }
    case "get_contact":
      payload = data.contact;
      break;
    default:
      return null;
  }
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    structuredContent: Array.isArray(payload) ? { items: payload } : payload,
    isError: false,
  };
}

export const onRequestOptions = (): Response => new Response(null, { status: 204, headers: CORS });

export const onRequestGet = (): Response =>
  new Response("Method Not Allowed – POST JSON-RPC messages to /mcp.", {
    status: 405,
    headers: { Allow: "POST, OPTIONS", ...CORS },
  });

export const onRequestPost = async (context: Context): Promise<Response> => {
  let message: JsonRpcRequest;
  try {
    message = (await context.request.json()) as JsonRpcRequest;
  } catch {
    return json(rpcError(null, -32700, "Parse error"), 400);
  }
  if (!message || message.jsonrpc !== "2.0" || typeof message.method !== "string") {
    return json(rpcError(message?.id ?? null, -32600, "Invalid Request"), 400);
  }
  if (message.id === undefined || message.id === null) {
    return new Response(null, { status: 202, headers: CORS });
  }

  switch (message.method) {
    case "initialize": {
      const requested = String(message.params?.protocolVersion ?? "");
      return json(
        rpcResult(message.id, {
          protocolVersion: SUPPORTED_VERSIONS.includes(requested) ? requested : SUPPORTED_VERSIONS[0],
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "crystalinteriors", title: "Crystal Interiors", version: "1.0.0" },
          instructions:
            "Read-only facts about Crystal Interiors, an interior design studio in Brno (CZ): services, indicative prices, portfolio, FAQ and contact. Inquiries are sent by people via https://www.crystalinteriors.cz/kontakt/.",
        }),
      );
    }
    case "ping":
      return json(rpcResult(message.id, {}));
    case "tools/list":
      return json(rpcResult(message.id, { tools: TOOLS }));
    case "tools/call": {
      const name = String(message.params?.name ?? "");
      const args = (message.params?.arguments ?? {}) as Record<string, unknown>;
      try {
        const output = await callTool(context, name, args);
        return output
          ? json(rpcResult(message.id, output))
          : json(rpcError(message.id, -32602, `Unknown tool: ${name}`));
      } catch {
        return json(
          rpcResult(message.id, {
            content: [{ type: "text", text: "Site data is temporarily unavailable." }],
            isError: true,
          }),
        );
      }
    }
    default:
      return json(rpcError(message.id, -32601, `Method not found: ${message.method}`));
  }
};
