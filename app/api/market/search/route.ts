import { searchStocks, getProviderInfo } from "@/lib/market";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  if (!query.trim()) return Response.json({ results: [], provider: getProviderInfo() });
  return Response.json({ results: searchStocks(query), provider: getProviderInfo() });
}
