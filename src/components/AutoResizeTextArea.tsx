import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

type Props = {
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
};

const MAX_ROWS = 5;

export default function AutoResizeTextarea({
  value,
  onChange,
  placeholder,
  disabled,
  onKeyDown,
}: Props) {
  const [inner, setInner] = useState(value ?? "");
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const composingRef = useRef(false);

  // 외부 value 변경 반영
  useEffect(() => {
    if (value !== undefined && value !== inner) setInner(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // 높이 자동 조절
  const resize = () => {
    const el = ref.current;
    if (!el) return;
    const cs = window.getComputedStyle(el);
    const lineHeight = parseFloat(cs.lineHeight || "0") || 20;
    el.style.height = "auto";
    const full = el.scrollHeight;
    const paddingY =
      parseFloat(cs.paddingTop || "0") + parseFloat(cs.paddingBottom || "0");
    const maxH = lineHeight * MAX_ROWS + paddingY;
    const nextH = Math.min(full, maxH);
    el.style.height = `${nextH}px`;
    el.style.overflowY = full > maxH ? "auto" : "hidden";
  };

  useLayoutEffect(resize, [inner]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setInner(v); // 로컬은 항상 갱신
    if (composingRef.current) {
      // 조합 중이면 부모 onChange 미호출
      return;
    }
    onChange?.(v);
  };

  const handleCompositionStart = () => {
    composingRef.current = true;
  };
  const handleCompositionEnd = (
    e: React.CompositionEvent<HTMLTextAreaElement>
  ) => {
    composingRef.current = false;
    const v = (e.target as HTMLTextAreaElement).value;
    setInner(v);
    onChange?.(v); // 조합 완료 시 한 번만 부모로 보냄
    resize();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 조합 중 Enter 처리 금지 (전송/개행 핸들러가 있다면 막기)
    if ((e.nativeEvent as any).isComposing || e.keyCode === 229) {
      e.stopPropagation();
      return;
    }
    onKeyDown?.(e);
  };

  return (
    <textarea
      ref={ref}
      value={inner}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      onInput={resize}
      placeholder={placeholder}
      disabled={disabled}
      rows={1}
      // 한국어 입력 안정화에 도움되는 옵션들
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      style={{
        resize: "none",
        overflowY: "hidden",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
      className="w-full border rounded-lg p-3 leading-6 border-gray-400 focus:outline-none focus:ring-0"
    />
  );
}
