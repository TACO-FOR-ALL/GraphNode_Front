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

  useEffect(() => {
    if (value !== undefined) setInner(value);
  }, [value]);

  useLayoutEffect(() => {
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
  }, [inner]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    if (onChange) onChange(v);
    if (value === undefined) setInner(v);
  };

  return (
    <textarea
      ref={ref}
      value={inner}
      onChange={handleChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      rows={1}
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
