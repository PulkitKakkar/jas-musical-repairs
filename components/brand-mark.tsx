import { cn } from "@/lib/utils";

export function BrandMark({
  light = false,
  compact = false,
  className,
}: {
  light?: boolean;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex flex-col items-center leading-none", light ? "text-white" : "text-ink", className)}>
      <span className={cn("rounded-[50%] border-2 px-4 py-1 font-black tracking-wide", compact ? "text-lg" : "text-2xl")}>
        JAS
      </span>
      <span className={cn("mt-1 font-bold tracking-[0.42em]", compact ? "text-[7px]" : "text-[9px]")}>ENGLAND</span>
    </div>
  );
}
