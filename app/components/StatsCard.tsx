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
      className={`group relative rounded-2xl p-4 flex items-center gap-4 border backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 ${
        isDark
          ? "bg-linear-to-br from-zinc-800/90 via-zinc-800/80 to-indigo-950/50 border-indigo-500/30 shadow-lg shadow-black/20"
          : "bg-linear-to-br from-white via-white to-indigo-50 border-indigo-100 shadow-md shadow-indigo-100/50"
      }`}
    >
      {/* Subtle glow effect on hover */}
      <div
        className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ${
          isDark
            ? "bg-linear-to-br from-indigo-500/5 to-transparent"
            : "bg-linear-to-br from-indigo-100/50 to-transparent"
        }`}
      />

      {/* Icon container with enhanced styling */}
      <div
        className={`relative w-12 h-12 rounded-xl flex items-center justify-center shadow-inner transition-transform duration-300 group-hover:scale-110 ${iconBgColor}`}
      >
        <div className={`${iconTextColor} transition-transform duration-300`}>
          {icon}
        </div>
      </div>

      {/* Content */}
      <div className="relative flex-1">
        <div
          className={`text-2xl font-bold tracking-tight ${
            isDark ? "text-white" : "text-slate-800"
          }`}
        >
          {value}
        </div>
        <div
          className={`text-xs font-medium uppercase tracking-wider ${
            isDark ? "text-zinc-400" : "text-slate-500"
          }`}
        >
          {label}
        </div>
      </div>

      {/* Decorative accent line */}
      <div
        className={`absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-l-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
          isDark ? "bg-indigo-500/50" : "bg-indigo-400/60"
        }`}
      />
    </div>
  );
}
