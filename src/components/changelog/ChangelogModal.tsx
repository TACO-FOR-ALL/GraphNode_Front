import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiX, FiGift, FiZap, FiArrowRight } from "react-icons/fi";
import { useChangelogStore } from "@/store/useChangelogStore";
import changelog from "@/data/changelog.json";

type LanguageKey = "ko" | "en" | "ja" | "zh";

interface ChangelogEntry {
  date: string;
  title: Record<LanguageKey, string>;
  features: Record<LanguageKey, string[]>;
  improvements: Record<LanguageKey, string[]>;
}

export default function ChangelogModal() {
  const { t, i18n } = useTranslation();
  const { isModalOpen, setModalOpen, setLastSeenVersion } = useChangelogStore();
  const modalRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const positionRef = useRef({ x: 0, y: 0 });

  const currentVersion = __APP_VERSION__;
  const lang = (i18n.language?.split("-")[0] || "en") as LanguageKey;
  const validLang = ["ko", "en", "ja", "zh"].includes(lang) ? lang : "en";

  const entry = (changelog as Record<string, ChangelogEntry>)[currentVersion];

  const applyTransform = () => {
    const el = modalRef.current;
    if (!el) return;
    const { x, y } = positionRef.current;
    el.style.transform = `translate(${x}px, ${y}px)`;
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartPos.current.x;
      const deltaY = e.clientY - dragStartPos.current.y;

      positionRef.current = {
        x: positionRef.current.x + deltaX,
        y: positionRef.current.y + deltaY,
      };

      dragStartPos.current = { x: e.clientX, y: e.clientY };
      applyTransform();
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    setIsDragging(true);
  };

  const handleClose = () => {
    setLastSeenVersion(currentVersion);
    setModalOpen(false);
  };

  if (!isModalOpen || !entry) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[9999] bg-black/30"
      onClick={handleClose}
    >
      <div
        ref={modalRef}
        className="flex flex-col w-[520px] max-h-[600px] shadow-[0_4px_32px_0_rgba(0,0,0,0.2)] rounded-2xl border border-base-border bg-bg-primary overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 - 드래그 가능 */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b border-base-border cursor-move select-none bg-gradient-to-r from-primary/10 to-transparent"
          onMouseDown={handleHeaderMouseDown}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <FiGift className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                {entry.title[validLang]}
              </h2>
              <p className="text-xs text-text-tertiary">
                v{currentVersion} • {entry.date}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-bg-tertiary transition-colors"
          >
            <FiX className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* 새로운 기능 */}
          {entry.features[validLang]?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FiZap className="w-4 h-4 text-yellow-500" />
                <h3 className="text-sm font-semibold text-text-primary">
                  {t("changelog.newFeatures", "New Features")}
                </h3>
              </div>
              <ul className="space-y-2">
                {entry.features[validLang].map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <span className="text-sm text-text-secondary">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 개선 사항 */}
          {entry.improvements[validLang]?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FiArrowRight className="w-4 h-4 text-green-500" />
                <h3 className="text-sm font-semibold text-text-primary">
                  {t("changelog.improvements", "Improvements")}
                </h3>
              </div>
              <ul className="space-y-2">
                {entry.improvements[validLang].map((improvement, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                    <span className="text-sm text-text-secondary">{improvement}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-base-border bg-bg-secondary/50">
          <button
            onClick={handleClose}
            className="w-full py-2.5 px-4 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            {t("changelog.gotIt", "Got it!")}
          </button>
        </div>
      </div>
    </div>
  );
}
