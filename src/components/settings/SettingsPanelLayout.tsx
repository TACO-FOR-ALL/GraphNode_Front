export default function SettingsPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start mx-48 justify-start w-[800px] h-full overflow-y-visible mt-36 gap-7 select-none">
      {children}
    </div>
  );
}
