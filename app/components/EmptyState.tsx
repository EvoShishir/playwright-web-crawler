interface EmptyStateProps {
  isDark: boolean;
}

export function EmptyState({ isDark }: EmptyStateProps) {
  return (
    <div
      className={`h-full flex flex-col items-center justify-center ${
        isDark ? "text-zinc-500" : "text-slate-400"
      }`}
    >
      <div
        className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
          isDark ? "bg-zinc-800" : "bg-slate-100"
        }`}
      >
        <svg
          className={`w-8 h-8 ${
            isDark ? "text-zinc-600" : "text-slate-400"
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
          />
        </svg>
      </div>
      <p className="text-sm">Activity logs will appear here</p>
      <p
        className={`text-xs mt-1 ${
          isDark ? "text-zinc-500" : "text-slate-400"
        }`}
      >
        Enter a URL and start crawling
      </p>
    </div>
  );
}
