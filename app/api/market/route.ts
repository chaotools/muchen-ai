import { getMarketSnapshot } from "@/lib/market";

export async function GET() {
  const { indexQuotes, latestNews, watchlistQuotes, provider } = await getMarketSnapshot();
  return Response.json({
    provider,
    updatedAt: new Date().toISOString(),
    indices: indexQuotes,
    watchlist: watchlistQuotes,
    news: latestNews
  });
}
