import type { ReactNode } from "react";

type StatusMessageVariant = "success" | "error" | "warning" | "info";

type StatusMessageProps = {
  variant?: StatusMessageVariant;
  title?: string;
  children: ReactNode;
};

const variantClasses: Record<StatusMessageVariant, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  error: "border-red-200 bg-red-50 text-red-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
};

const titleClasses: Record<StatusMessageVariant, string> = {
  success: "text-emerald-800",
  error: "text-red-800",
  warning: "text-amber-800",
  info: "text-blue-800",
};

export default function StatusMessage({
  variant = "info",
  title,
  children,
}: StatusMessageProps) {
  return (
    <div
      className={`rounded-xl border p-4 text-sm font-bold leading-6 ${variantClasses[variant]}`}
    >
      {title && (
        <p className={`mb-1 font-black ${titleClasses[variant]}`}>{title}</p>
      )}

      <div className="break-words">{children}</div>
    </div>
  );
}