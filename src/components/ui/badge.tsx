import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-[#0a0a0a]",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-indigo-600 text-white",
        secondary:
          "border-transparent bg-[#1a1a1a] text-zinc-300",
        destructive:
          "border-transparent bg-red-600/20 text-red-400",
        outline:
          "border-[#2a2a2a] text-zinc-400",
        success:
          "border-transparent bg-emerald-600/20 text-emerald-400",
        warning:
          "border-transparent bg-amber-600/20 text-amber-400",
        "phase-volume":
          "border-transparent bg-blue-600/20 text-blue-400",
        "phase-tonality":
          "border-transparent bg-purple-600/20 text-purple-400",
        "phase-pause":
          "border-transparent bg-orange-600/20 text-orange-400",
        "phase-storytelling":
          "border-transparent bg-green-600/20 text-green-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
