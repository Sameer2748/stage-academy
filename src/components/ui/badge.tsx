import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-indigo-600 text-white",
        secondary:
          "border-transparent bg-slate-100 text-slate-600",
        destructive:
          "border-transparent bg-red-50 text-red-600",
        outline:
          "border-slate-200 text-slate-500",
        success:
          "border-transparent bg-emerald-50 text-emerald-700",
        warning:
          "border-transparent bg-amber-50 text-amber-700",
        "phase-volume":
          "border-transparent bg-blue-50 text-blue-700",
        "phase-tonality":
          "border-transparent bg-purple-50 text-purple-700",
        "phase-pause":
          "border-transparent bg-orange-50 text-orange-700",
        "phase-storytelling":
          "border-transparent bg-green-50 text-green-700",
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
