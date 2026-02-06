import { useToastStore, Toast } from "@/store/useToastStore";
import { IoClose } from "react-icons/io5";

export default function Toaster() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg backdrop-blur-md animate-slide-in ${
            toast.type === "error"
              ? "bg-red-500/90 text-white"
              : toast.type === "success"
                ? "bg-green-500/90 text-white"
                : "bg-amber-500/90 text-white"
          }`}
        >
          <ToastIcon type={toast.type} />
          <span className="text-sm font-medium">{toast.message}</span>

          {toast.action && (
            <button
              onClick={() => {
                toast.action?.onClick();
                removeToast(toast.id);
              }}
              className="text-sm font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity text-white"
            >
              {toast.action.label}
            </button>
          )}

          <button
            onClick={() => removeToast(toast.id)}
            className="ml-2 hover:opacity-70 transition-opacity"
          >
            <IoClose className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

function ToastIcon({ type }: { type: Toast["type"] }) {
  const className = "w-5 h-5 flex-shrink-0";

  switch (type) {
    case "error":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
    case "success":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "info":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
}
