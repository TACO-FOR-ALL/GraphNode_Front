import { useLocation, useNavigate } from "react-router-dom";
import MarkdownEditor from "@/components/notes/MarkdownEditor";

export default function Note() {
  const location = useLocation();
  const navigate = useNavigate();

  const noteId = (() => {
    const match = location.pathname.match(/^\/note(?:\/([^/?#]+))?/);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  })();

  const headingText = new URLSearchParams(location.search).get("heading");

  const navigateToNote = (
    targetNoteId: string,
    targetHeading?: string | null,
  ) => {
    const search = targetHeading
      ? `?heading=${encodeURIComponent(targetHeading)}`
      : "";
    navigate(`/note/${encodeURIComponent(targetNoteId)}${search}`);
  };

  return (
    <div className="h-full overflow-auto bg-sidebar-expanded-background px-8 py-8">
      <MarkdownEditor
        noteId={noteId}
        scrollToHeading={headingText}
        onNavigateToNote={navigateToNote}
      />
    </div>
  );
}
