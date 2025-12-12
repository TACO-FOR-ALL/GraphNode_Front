import HomeTitle from "@/components/home/HomeTitle";
import ChatBox from "@/components/home/ChatBox";
import RecentNotes from "@/components/home/RecentNotes";
import { useEffect } from "react";
import { pullNotesOnce } from "@/managers/syncNoteWorker";

export default function Home() {
  // 로그인 후 메인에서 노트 및 채팅 동기화 작업을 진행합니다
  useEffect(() => {
    (async () => {
      await pullNotesOnce();
    })();
  }, []);

  return (
    <div className="flex flex-col items-center">
      <HomeTitle username={"John Han"} />
      <ChatBox />
      <RecentNotes />
    </div>
  );
}
