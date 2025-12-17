import SettingsPanelLayout from "./SettingsPanelLayout";
import { FaPen, FaSignOutAlt } from "react-icons/fa";
import { Me } from "@/types/Me";
import SettingCategoryTitle from "./SettingCategoryTitle";
import ApiKeyManager from "./ApiKeyManager";
import OpenAI from "@/assets/icons/openai.svg";
import DeepSeek from "@/assets/icons/deepseek.svg";
import { api } from "@/apiClient";
import { useEffect, useState } from "react";

export default function MyAccountPanel({ userInfo }: { userInfo: Me }) {
  const [openaiApiKey, setOpenaiApiKey] = useState<boolean>(false);
  const [deepseekApiKey, setDeepseekApiKey] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      const result_openai = await api.me.getApiKeys("openai");
      const result_deepseek = await api.me.getApiKeys("deepseek");
      // @ts-ignore
      setOpenaiApiKey(result_openai.data?.apiKey ? true : false);
      // @ts-ignore
      setDeepseekApiKey(result_deepseek.data?.apiKey ? true : false);
    })();
  }, []);

  return (
    <SettingsPanelLayout>
      <div className="flex items-start justify-start gap-4">
        <div className="flex items-start justify-start w-[80px] h-[80px] rounded-full overflow-hidden group cursor-pointer">
          <div className="hidden group-hover:flex absolute w-[80px] h-[80px] items-center justify-center bg-black/50 z-10 rounded-full">
            <FaPen className="text-white text-[16px]" />
          </div>
          <img
            src={userInfo.profile.avatarUrl}
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
            alt="avatar"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex flex-col items-start justify-center gap-1">
          <p className="text-[28px] font-medium">
            {userInfo.profile.displayName}
          </p>
          <p className="text-[20px] text-text-secondary font-medium">
            {userInfo.profile.email}
          </p>
        </div>
      </div>
      <div className="flex flex-col items-start justify-start gap-4 w-full">
        <SettingCategoryTitle
          title="AI Provider API Key"
          subtitle="Manage your AI provider API key safely."
        />
        <ApiKeyManager
          id="openai"
          logo={OpenAI}
          title="OpenAI"
          isVerified={openaiApiKey}
          setIsVerified={setOpenaiApiKey}
        />
        <ApiKeyManager
          id="deepseek"
          logo={DeepSeek}
          title="DeepSeek"
          isVerified={deepseekApiKey}
          setIsVerified={setDeepseekApiKey}
        />
      </div>
      <button
        onClick={async () => {
          await api.me.logout();
          window.electron?.send("auth-logout");
        }}
        className="flex items-center justify-center gap-2 cursor-pointer"
      >
        <FaSignOutAlt className="text-[20px] text-frame-bar-red" />
        <p className="text-[14px] text-frame-bar-red">Logout</p>
      </button>
    </SettingsPanelLayout>
  );
}
