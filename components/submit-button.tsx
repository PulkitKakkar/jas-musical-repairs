"use client";

import { useFormStatus } from "react-dom";
import { LoadingOverlay } from "@/components/loading-overlay";

export function SubmitButton({ children, className = "btn-primary" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <>
      {pending && <LoadingOverlay />}
      <button className={className} disabled={pending}>{pending ? "Working…" : children}</button>
    </>
  );
}
