interface StatsCardProps {
  value: number;
  label: string;
  icon: React.ReactNode;
  isDark: boolean;
  iconBgColor: string;
  iconTextColor: string;
}

export function StatsCard({
  value,
  label,
  icon,
  isDark,
  iconBgColor,
  iconTextColor,
}: StatsCardProps) {
  return (
    <div
      className={`rounded-xl p-4 flex items-center gap-4 border ${
        isDark
          ? "bg-zinc-800/80 border-zinc-600/80"
          : "bg-white/80 border-slate-200"
      }`}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBgColor}`}>
        <div className={iconTextColor}>{icon}</div>
      </div>
      <div>
        <div
          className={`text-2xl font-bold ${
            isDark ? "text-white" : "text-slate-900"
          }`}
        >
          {value}
        </div>
        <div
          className={`text-xs uppercase tracking-wider ${
            isDark ? "text-zinc-500" : "text-slate-500"
          }`}
        >
          {label}
        </div>
      </div>
    </div>
  );
}
