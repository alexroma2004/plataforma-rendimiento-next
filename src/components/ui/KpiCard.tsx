type KpiCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  badge?: string;
};

export default function KpiCard({
  title,
  value,
  subtitle,
  badge,
}: KpiCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {value}
          </p>
        </div>

        {badge ? (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {badge}
          </span>
        ) : null}
      </div>

      {subtitle ? (
        <p className="mt-3 text-sm text-slate-500">{subtitle}</p>
      ) : null}
    </div>
  );
}