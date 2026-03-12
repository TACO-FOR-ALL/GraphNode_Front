import HomeTitle from "@/components/home/HomeTitle";
import ChatSendBox from "@/components/home/ChatSendBox";
import RecentNotes from "@/components/home/RecentNotes";

export default function Home({ username }: { username: string }) {
  return (
    <div className="flex flex-col items-center bg-bg-primary min-h-full">
      <HomeTitle username={username} />
      <ChatSendBox />
      <RecentNotes />
    </div>
  );
}
