interface FooterProps {
  isDark: boolean;
}

export function Footer({ isDark }: FooterProps) {
  return (
    <footer
      className={`border-t-2 ${
        isDark ? "border-zinc-600/80" : "border-slate-200"
      }`}
    >
      <div className="px-6 py-6">
        <div
          className={`flex items-center justify-between text-sm ${
            isDark ? "text-zinc-500" : "text-slate-400"
          }`}
        >
          <p>Real-time web crawling</p>
          <p>
            &copy; {new Date().getFullYear()} EvoSHiSHiR | All rights reserved
          </p>
        </div>
      </div>
    </footer>
  );
}
