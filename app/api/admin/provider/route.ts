import { IfindMcpProvider } from "@/lib/market";
import { requireUser, apiError } from "@/lib/access";

export async function POST(request: Request) {
  try { await requireUser(request, true); } catch (error) { return apiError(error); }
  if (!process.env.IFIND_MCP_URL || !process.env.IFIND_MCP_AUTH_KEY) {
    return Response.json({ ok: false, error: "尚未配置 iFinD MCP URL 或服务端 Key" }, { status: 400 });
  }
  try {
    const tools = await new IfindMcpProvider().listTools();
    return Response.json({ ok: true, toolCount: tools.length, tools: tools.map((tool) => tool.name) });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "MCP 连接检查失败" }, { status: 502 });
  }
}
