import { threadRepo } from "@/managers/threadRepo";
import DropJsonZone from "../DropJsonZone";
import SettingsPanelLayout from "./SettingsPanelLayout";

export default function DataPrivacyPanel() {
  return (
    <SettingsPanelLayout>
      <DropJsonZone />
      <button
        onClick={async () => {
          await threadRepo.clearAll();
        }}
        className="bg-red-500 text-white px-4 py-2 rounded-md"
      >
        Clear All Chats
      </button>
      <button
        onClick={async () => {
          await threadRepo.clearAll();
        }}
        className="bg-red-500 text-white px-4 py-2 rounded-md"
      >
        Clear All Notes
      </button>
    </SettingsPanelLayout>
  );
}
