import { useParams } from "react-router-dom";
import MarkdownEditor from "@/components/notes/MarkdownEditor";

export default function Note() {
  const { noteId } = useParams<{ noteId?: string }>();

  return (
    <div className="h-full overflow-auto bg-sidebar-expanded-background px-8 py-8">
      <MarkdownEditor noteId={noteId || null} />
    </div>
  );
}
