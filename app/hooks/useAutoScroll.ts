import { useRef, useEffect, useState } from "react";

export function useAutoScroll(dependencies: unknown[]) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // Auto-scroll to bottom when dependencies update
  useEffect(() => {
    if (shouldAutoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [shouldAutoScroll, ...dependencies]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 10;
    setShouldAutoScroll(isAtBottom);
  };

  const resetAutoScroll = () => {
    setShouldAutoScroll(true);
  };

  return {
    containerRef,
    handleScroll,
    resetAutoScroll,
  };
}
