"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type HorizontalTableScrollProps = {
  children: ReactNode;
  label?: string;
};

export function HorizontalTableScroll({
  children,
  label = "Scroll sideways to see all columns",
}: HorizontalTableScrollProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [maxScroll, setMaxScroll] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const measure = () => {
      setMaxScroll(Math.max(0, element.scrollWidth - element.clientWidth));
      setScrollLeft(element.scrollLeft);
    };

    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(element);
    if (element.firstElementChild) resizeObserver.observe(element.firstElementChild);
    window.addEventListener("resize", measure);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const moveTo = (nextValue: number) => {
    const element = scrollRef.current;
    if (!element) return;
    const nextScroll = Math.max(0, Math.min(maxScroll, nextValue));
    element.scrollTo({ left: nextScroll, behavior: "smooth" });
    setScrollLeft(nextScroll);
  };

  const moveBy = (distance: number) => {
    moveTo((scrollRef.current?.scrollLeft ?? scrollLeft) + distance);
  };

  return (
    <div>
      <div className="horizontal-scroll-control">
        <button
          aria-label="Scroll repair table left"
          className="horizontal-scroll-button"
          disabled={!maxScroll || scrollLeft <= 0}
          onClick={() => moveBy(-420)}
          type="button"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-wider text-ink/50">
            <span>{label}</span>
            <span className="hidden normal-case tracking-normal text-ink/40 sm:inline">
              {maxScroll ? "Drag the bar or use the arrows" : "All columns visible"}
            </span>
          </div>
          <input
            aria-label={label}
            className="horizontal-scroll-range"
            disabled={!maxScroll}
            max={maxScroll}
            min={0}
            onChange={(event) => moveTo(Number(event.target.value))}
            type="range"
            value={Math.min(scrollLeft, maxScroll)}
          />
        </div>

        <button
          aria-label="Scroll repair table right"
          className="horizontal-scroll-button"
          disabled={!maxScroll || scrollLeft >= maxScroll - 2}
          onClick={() => moveBy(420)}
          type="button"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div
        className="table-scroll"
        onScroll={() => setScrollLeft(scrollRef.current?.scrollLeft ?? 0)}
        ref={scrollRef}
      >
        {children}
      </div>
    </div>
  );
}
