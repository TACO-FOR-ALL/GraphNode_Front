import { useParams } from "react-router-dom";
import MarkdownEditor from "@/components/notes/MarkdownEditor";

export default function Note() {
  const { noteId } = useParams<{ noteId?: string }>();

  return (
    <div className="py-8 bg-sidebar-expanded-background">
      <MarkdownEditor noteId={noteId || null} />
    </div>
  );
}
