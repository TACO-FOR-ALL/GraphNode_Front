import { useTranslation } from "react-i18next";

export default function HomeTitle({ username }: { username: string }) {
  const { t } = useTranslation();

  return (
    <div className="mt-[140px] flex flex-col items-center justify-center gap-3 mb-10 text-text-primary">
      <p className="font-noto-sans-kr font-semibold text-[28px]">
        {t("home.title", { provider: username })}
      </p>
      <p className="font-noto-sans-kr text-[28px]">{t("home.subtitle")}</p>
    </div>
  );
}
