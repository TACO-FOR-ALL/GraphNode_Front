import HomeTitle from "@/components/home/HomeTitle";
import ChatBox from "@/components/home/ChatBox";
import RecentNotes from "@/components/home/RecentNotes";
import { useEffect } from "react";
import { pullNotesOnce } from "@/managers/syncNoteWorker";
import { api } from "@/apiClient";
import { useSyncStore } from "@/store/useSyncStore";

export default function Home({ username }: { username: string }) {
  const { isSyncronized, setIsSyncronized } = useSyncStore();

  useEffect(() => {
    (async () => {
      await pullNotesOnce();
      // 서버 데이터를 가져와서 로컬 데이터와 비교하여 동기화
      if (!isSyncronized) {
        const res = await api.sync.pull();
        // TODO: 채팅 노트 비교 후 동기화 필요하면 동기화
        if (res.isSuccess) {
          setIsSyncronized(true);
        }
      }
    })();
  }, []);

  return (
    <div className="flex flex-col items-center bg-bg-primary min-h-full">
      <HomeTitle username={username} />
      <ChatBox />
      <RecentNotes />
    </div>
  );
}
