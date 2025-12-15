import { api } from "@/apiClient";
import { useState } from "react";

export default function ApiKeyManager({
  id,
  logo,
  title,
  isVerified,
  setIsVerified,
}: {
  id: "openai" | "deepseek";
  logo: string;
  title: string;
  isVerified: boolean;
  setIsVerified: (apiKey: boolean) => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    // const res = await window.openaiAPI.checkAPIKeyValid(apiKey);
    // if (res.ok) await window.keytarAPI.setAPIKey("openai", apiKey);
    await api.me.updateApiKey("openai", apiKey);
    setIsVerified(true);
    setLoading(false);
  };

  const handleDelete = async () => {
    setLoading(true);
    await api.me.deleteApiKey(id);
    setIsVerified(false);
    setLoading(false);
  };

  return (
    <div className="flex w-full justify-between items-center">
      <div className="flex items-center justify-center gap-[18px] flex-shrink-0">
        <img src={logo} alt={title} className="w-[30px] h-[30px]" />
        <div className="flex flex-col items-start justify-center gap-[10px]">
          <p className="text-[16px] font-medium">{title}</p>
          {isVerified ? (
            <div className="border border-solid border-text-tertiary rounded-sm px-2 py-1 h-6 w-[387px] text-[6px]">
              <p className="translate-y-[2px]">{"● ".repeat(49)}</p>
            </div>
          ) : (
            <input
              type="password"
              value={apiKey}
              placeholder={`Enter your ${title} API key`}
              onChange={(e) => setApiKey(e.target.value)}
              className="border border-solid border-text-tertiary rounded-sm px-2 py-1 h-6 w-[387px] focus:outline-none placeholder:text-text-placeholder placeholder:opacity-50 placeholder:text-[12px] text-[20px] appearance-none"
            />
          )}
        </div>
      </div>
      <div
        onClick={loading ? undefined : handleSubmit}
        className="flex items-center justify-center gap-4"
      >
        {isVerified ? (
          <p className="cursor-pointer text-[14px] text-[#00CA4E]">Verified</p>
        ) : (
          <p className="cursor-pointer text-[14px] text-text-secondary hover:text-text-primary transition-colors duration-300">
            Sumbit
          </p>
        )}
        <p
          onClick={loading ? undefined : handleDelete}
          className="cursor-pointer text-[14px] text-[#FF605C]"
        >
          Delete
        </p>
      </div>
    </div>
  );
}
