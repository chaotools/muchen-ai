import AppShell from "@/components/app-shell";
import TopicWorkspace from "@/components/topic-workspace";
import { getTopicSnapshot } from "@/lib/free-data";

export const dynamic = "force-dynamic";

export default async function TopicsPage() {
  const snapshot = await getTopicSnapshot();
  return <AppShell dataMode={snapshot.mode}><div className="page-wrap topic-page"><TopicWorkspace topics={snapshot.topics} dataMode={snapshot.mode} dataNote={snapshot.note} /></div></AppShell>;
}
