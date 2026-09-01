type JsonRpcEnvelope = {
  result?: unknown;
  error?: { code?: number; message?: string };
};

type McpTool = {
  name: string;
  description?: string;
  inputSchema?: unknown;
};

function parseEventStream(body: string): JsonRpcEnvelope {
  const messages = body.split(/\n\n+/).flatMap((event) => {
    const data = event.split(/\r?\n/).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join("\n");
    if (!data || data === "[DONE]") return [];
    try {
      return [JSON.parse(data) as JsonRpcEnvelope];
    } catch {
      return [];
    }
  });
  return messages.at(-1) ?? {};
}

async function readMcpResponse(response: Response): Promise<JsonRpcEnvelope> {
  const body = await response.text();
  if (!body.trim()) return {};
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("text/event-stream") || body.includes("data:")) return parseEventStream(body);
  try {
    return JSON.parse(body) as JsonRpcEnvelope;
  } catch {
    throw new Error("iFinD MCP 返回了无法解析的响应");
  }
}

export class IfindMcpClient {
  private sessionId: string | null = null;
  private authMode: "raw" | "bearer";

  constructor(private readonly url: string, private readonly key: string) {
    this.authMode = process.env.IFIND_MCP_AUTH_MODE === "bearer" ? "bearer" : "raw";
  }

  private headers() {
    return {
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
      Authorization: this.authMode === "bearer" ? `Bearer ${this.key}` : this.key,
      ...(this.sessionId ? { "Mcp-Session-Id": this.sessionId } : {})
    };
  }

  async request(method: string, params?: unknown, id?: number): Promise<JsonRpcEnvelope> {
    const body: Record<string, unknown> = { jsonrpc: "2.0", method };
    if (id !== undefined) body.id = id;
    if (params !== undefined) body.params = params;

    let response = await fetch(this.url, { method: "POST", headers: this.headers(), body: JSON.stringify(body), cache: "no-store" });
    if (response.status === 401 && this.authMode === "raw") {
      this.authMode = "bearer";
      response = await fetch(this.url, { method: "POST", headers: this.headers(), body: JSON.stringify(body), cache: "no-store" });
    }
    if (!response.ok && response.status !== 202) {
      const message = await response.text().catch(() => "");
      throw new Error(`iFinD MCP 请求失败（${response.status}）${message.slice(0, 180)}`);
    }

    const nextSessionId = response.headers.get("mcp-session-id");
    if (nextSessionId) this.sessionId = nextSessionId;
    const payload = await readMcpResponse(response);
    if (payload.error) throw new Error(payload.error.message ?? "iFinD MCP 返回错误");
    return payload;
  }

  async initialize() {
    await this.request("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "muchen-ai", version: "0.2.0" } }, 1);
    await this.request("notifications/initialized");
  }

  async listTools(): Promise<McpTool[]> {
    await this.initialize();
    const payload = await this.request("tools/list", {}, 2);
    const result = payload.result as { tools?: McpTool[] } | undefined;
    return result?.tools ?? [];
  }
}
