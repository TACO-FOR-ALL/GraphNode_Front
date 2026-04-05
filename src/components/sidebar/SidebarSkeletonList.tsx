const WIDTHS = [
  72, 58, 85, 63, 78, 55, 80, 66, 74, 52, 88, 61, 72, 58, 85, 63, 78, 55, 80,
];

export default function SidebarSkeletonList() {
  return (
    <div className="flex flex-col gap-[6px]">
      {WIDTHS.map((w, i) => (
        <div
          key={i}
          className="h-[32px] px-[6px] rounded-[6px] flex items-center"
        >
          <div
            className="h-[10px] rounded-md bg-gray-200 dark:bg-gray-700 animate-pulse"
            style={{ width: `${w}%` }}
          />
        </div>
      ))}
    </div>
  );
}
