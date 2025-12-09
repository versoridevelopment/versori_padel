// src/components/ui/Button.tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-xl text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        primary:
          "bg-blue-600 text-white hover:bg-blue-500 focus:ring-blue-500 shadow-lg shadow-blue-500/20",
        outline:
          "border border-neutral-700 text-neutral-200 hover:border-neutral-600 hover:bg-neutral-900/40 focus:ring-neutral-500",
        white:
          "bg-white text-blue-700 hover:bg-neutral-100 focus:ring-blue-500",
        ghost:
          "text-neutral-400 hover:text-white hover:bg-neutral-900/30 focus:ring-neutral-500",
      },
      size: {
        default: "px-5 py-3",
        sm: "px-3 py-2 text-xs",
        lg: "px-6 py-4 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}

export default Button;
