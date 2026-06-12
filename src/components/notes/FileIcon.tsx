import { FaFilePdf, FaFileWord, FaFilePowerpoint, FaFile } from "react-icons/fa";
import { UserFileCategory } from "@/types/UserFile";

export default function FileIcon({ category }: { category: UserFileCategory }) {
  const cls = "w-3.5 h-3.5 shrink-0";
  switch (category) {
    case "pdf": return <FaFilePdf className={`${cls} text-red-400`} />;
    case "word": return <FaFileWord className={`${cls} text-blue-400`} />;
    case "ppt": return <FaFilePowerpoint className={`${cls} text-orange-400`} />;
    default: return <FaFile className={`${cls} text-text-tertiary`} />;
  }
}
