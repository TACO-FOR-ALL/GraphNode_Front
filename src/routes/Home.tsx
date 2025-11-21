import HomeTitle from "@/components/home/HomeTitle";
import ChatBox from "@/components/home/ChatBox";
import RecentNotes from "@/components/home/RecentNotes";

export default function Home() {
  return (
    <div className="flex flex-col items-center">
      <HomeTitle username={"John Han"} />
      <ChatBox />
      <RecentNotes />
    </div>
  );
}
