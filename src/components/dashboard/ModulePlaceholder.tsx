type ModulePlaceholderProps = {
  title: string;
  description: string;
  items: string[];
};

export default function ModulePlaceholder({
  title,
  description,
  items,
}: ModulePlaceholderProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">
          Módulo en construcción
        </p>

        <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
          {title}
        </h2>

        <p className="mt-3 max-w-4xl text-slate-600">{description}</p>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <div
            key={item}
            className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-700"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}