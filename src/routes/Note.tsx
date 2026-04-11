import MarkdownEditor from "@/components/notes/MarkdownEditor";

const getNoteIdFromHash = () => {
  const hashPath = window.location.hash.replace(/^#/, "");
  const [pathname] = hashPath.split("?");
  const match = pathname.match(/^\/note(?:\/([^/?#]+))?/);

  return match?.[1] ? decodeURIComponent(match[1]) : null;
};

export default function Note() {
  const noteId = getNoteIdFromHash();

  return (
    <div className="h-full overflow-auto bg-sidebar-expanded-background px-8 py-8">
      <MarkdownEditor noteId={noteId} />
    </div>
  );
}
