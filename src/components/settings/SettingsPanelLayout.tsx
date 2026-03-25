export default function SettingsPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-center overflow-y-scroll h-full select-none">
      <div className="flex flex-col items-start mx-48 justify-start w-[800px] mt-36 gap-7 scroll-hidden">
        {children}
        <div className="h-20 flex-shrink-0" />
      </div>
    </div>
  );
}
