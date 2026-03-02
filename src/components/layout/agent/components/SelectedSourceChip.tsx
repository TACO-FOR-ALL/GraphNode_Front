import { IoClose } from "react-icons/io5";

interface SelectedSourceChipProps {
  id: string;
  title: string;
  onRemove: (id: string) => void;
}

export default function SelectedSourceChip({
  id,
  title,
  onRemove,
}: SelectedSourceChipProps) {
  return (
    <div className="flex items-center relative gap-1 border px-2 py-1.5 text-[10px] border-text-placeholder text-text-secondary rounded-full group">
      <button
        onClick={() => onRemove(id)}
        className="absolute top-0 right-0 hidden group-hover:flex items-center justify-center bg-text-secondary z-10 rounded-full h-full aspect-square opacity-70 cursor-pointer"
      >
        <IoClose className="w-3 h-3 text-white" />
      </button>
      <span className="truncate max-w-[70px]">{title}</span>
    </div>
  );
}
