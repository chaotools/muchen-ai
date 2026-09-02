import { searchStocksAsync } from "@/lib/market";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  const { results, provider } = await searchStocksAsync(query);
  return Response.json({ results, provider });
}
