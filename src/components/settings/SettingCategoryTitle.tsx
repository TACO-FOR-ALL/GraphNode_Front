export default function SettingCategoryTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col items-start justify-start gap-1">
      <p className="text-[20px] font-medium text-text-primary">{title}</p>
      {subtitle && (
        <p className="text-[14px] text-text-secondary font-medium">
          {subtitle}
        </p>
      )}
    </div>
  );
}
