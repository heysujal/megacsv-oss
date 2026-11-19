// Form controls: native elements, styled. Native selects keep the browser's
// own list, which works with the keyboard, on phones and in the e2e scripts.
import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";

const box =
  "h-10 rounded-control bg-sheet px-3 text-[15px] text-ink shadow-[0_0_0_1px_var(--hairline)] outline-none transition-shadow focus-visible:shadow-[0_0_0_2px_var(--cobalt)] focus-visible:outline-none placeholder:text-muted disabled:opacity-50";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(box, "min-w-0", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(box, "h-auto py-2 leading-normal", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(box, "select min-w-0 cursor-pointer", className)} {...props} />;
}

export function Check({ children, className, ...props }: ComponentProps<"input"> & { children: ReactNode }) {
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-2 text-[14px] select-none", className)}>
      <input className="size-4 cursor-pointer" {...props} />
      {children}
    </label>
  );
}

export function Field({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cn("flex flex-col gap-1.5 text-[14px] font-medium", className)}>
      <span>{label}</span>
      {children}
    </label>
  );
}
