import AppShell from "@/components/app-shell";
import TopicWorkspace from "@/components/topic-workspace";
import { topicUniverse } from "@/lib/topics";

export default function TopicsPage() {
  return <AppShell><div className="page-wrap topic-page"><TopicWorkspace topics={topicUniverse} /></div></AppShell>;
}
