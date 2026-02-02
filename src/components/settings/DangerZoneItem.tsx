import { MouseEvent, MouseEventHandler } from "react";
import { IoTrash, IoWarning } from "react-icons/io5";

export default function DangerZoneItem({
  title,
  subtitle,
  cancel,
  deleteText,
  deleting,
  confirmDelete,
  isDeleting,
  showConfirm,
  setShowConfirm,
  handleClearTarget,
}: {
  title: string;
  subtitle: string;
  cancel: string;
  deleteText: string;
  deleting: string;
  confirmDelete: string;
  isDeleting: boolean;
  showConfirm: boolean;
  setShowConfirm: React.Dispatch<React.SetStateAction<boolean>>;
  handleClearTarget: MouseEventHandler<HTMLButtonElement>;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-bg-secondary rounded-lg border border-red-200 dark:border-red-900/30">
      <div className="flex-1">
        <p className="text-sm font-medium text-text-primary">{title}</p>
        <p className="text-xs text-text-secondary mt-1">{subtitle}</p>
      </div>
      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
        >
          <IoTrash className="text-base" />
          {deleteText}
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConfirm(false)}
            disabled={isDeleting}
            className="px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors"
          >
            {cancel}
          </button>
          <button
            onClick={handleClearTarget}
            disabled={isDeleting}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <IoWarning className="text-base" />
            {isDeleting ? deleting : confirmDelete}
          </button>
        </div>
      )}
    </div>
  );
}
