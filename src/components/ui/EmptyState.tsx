import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export default function EmptyState({
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-lg font-black text-slate-500 shadow-sm">
        —
      </div>

      <h3 className="mt-4 break-words text-lg font-black text-slate-950">
        {title}
      </h3>

      {description && (
        <p className="mx-auto mt-2 max-w-2xl break-words text-sm font-bold leading-6 text-slate-600">
          {description}
        </p>
      )}

      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}