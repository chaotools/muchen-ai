import { indexQuotes, latestNews, watchlistQuotes, getProviderInfo } from "@/lib/market";

export async function GET() {
  return Response.json({
    provider: getProviderInfo(),
    updatedAt: new Date().toISOString(),
    indices: indexQuotes,
    watchlist: watchlistQuotes,
    news: latestNews
  });
}
