import { notFound } from "next/navigation";
import AppShell from "@/components/app-shell";
import TopicDetailView from "@/components/topic-detail-view";
import { getTopicSnapshot } from "@/lib/free-data";

export const dynamic = "force-dynamic";

export default async function TopicDetailPage({ params }: { params: Promise<{ topicId: string }> }) {
  const { topicId } = await params;
  const snapshot = await getTopicSnapshot();
  const topic = snapshot.topics.find((item) => item.id === topicId);
  if (!topic) notFound();

  return <AppShell dataMode={snapshot.mode}><div className="page-wrap topic-detail-page"><TopicDetailView topic={topic} /></div></AppShell>;
}
