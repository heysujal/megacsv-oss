// Buttons (shadcn's pattern, Quiet Office look): one primary per view, cobalt;
// secondary on tone 2; quiet ones transparent until hover.
import { type VariantProps, cva } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "./cn";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control font-medium select-none transition-[background-color,transform,opacity] duration-[120ms] ease-out-quint active:scale-[0.97] active:duration-[160ms] disabled:opacity-50 disabled:active:scale-100 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-cobalt text-on-cobalt hover:bg-[color-mix(in_oklab,var(--cobalt)_90%,var(--ink))]",
        secondary: "bg-tone-2 text-ink hover:bg-[color-mix(in_oklab,var(--tone-2)_85%,var(--ink))]",
        quiet: "bg-transparent text-ink hover:bg-tone-1",
        link: "bg-transparent text-cobalt underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        md: "h-10 px-[18px] text-[15px]",
        sm: "h-8 px-3 text-[14px]",
        icon: "size-9 p-0",
        iconSm: "size-8 p-0",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export function Button({ className, variant, size, type = "button", ...props }: ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
