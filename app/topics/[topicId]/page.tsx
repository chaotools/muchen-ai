import { notFound } from "next/navigation";
import AppShell from "@/components/app-shell";
import TopicDetailView from "@/components/topic-detail-view";
import { getTopic } from "@/lib/topics";

export default async function TopicDetailPage({ params }: { params: Promise<{ topicId: string }> }) {
  const { topicId } = await params;
  const topic = getTopic(topicId);
  if (!topic) notFound();

  return <AppShell><div className="page-wrap topic-detail-page"><TopicDetailView topic={topic} /></div></AppShell>;
}
