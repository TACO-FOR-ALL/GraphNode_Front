import { threadRepo } from "@/managers/threadRepo";
import DropJsonZone from "../DropJsonZone";
import SettingsPanelLayout from "./SettingsPanelLayout";
import { api } from "@/apiClient";
import { noteRepo } from "@/managers/noteRepo";

export default function DataPrivacyPanel() {
  return (
    <SettingsPanelLayout>
      <DropJsonZone />
      <button
        onClick={async () => {
          // transaction으로 작업 묶어야함
          await threadRepo.clearAll();
          await api.conversations.deleteAll();
        }}
        className="bg-red-500 text-white px-4 py-2 rounded-md"
      >
        Clear All Chats
      </button>
      <button
        onClick={async () => {
          await threadRepo.clearAll();
          await api.note.deleteAllNotes();
          await api.note.deleteAllFolders();
        }}
        className="bg-red-500 text-white px-4 py-2 rounded-md"
      >
        Clear All Notes
      </button>
      <div className="flex gap-4">
        <button
          onClick={async () => {
            const result = await threadRepo.getThreadList();
            console.log(result);
          }}
        >
          get client chat
        </button>
        <button
          onClick={async () => {
            const result = await api.conversations.list();
            console.log(result);
          }}
        >
          get server chat
        </button>
      </div>
      <div className="flex gap-4">
        <button
          onClick={async () => {
            const result = await noteRepo.getAllNotes();
            console.log(result);
          }}
        >
          get client notes
        </button>
        <button
          onClick={async () => {
            const result = await api.note.listNotes();
            console.log(result);
          }}
        >
          get server notes
        </button>
      </div>
      <button
        onClick={async () => {
          const result = await api.graphAi.generateGraph();
          console.log(result);
        }}
      >
        generate graph
      </button>
    </SettingsPanelLayout>
  );
}
