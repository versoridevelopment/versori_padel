// src/components/ui/SectionTitle.tsx
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  className?: string;
  children?: ReactNode;
}

export default function SectionTitle({
  title,
  subtitle,
  className,
  children,
}: SectionTitleProps) {
  return (
    <div className={cn("text-center mb-12", className)}>
      <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-3 text-neutral-400 max-w-2xl mx-auto">{subtitle}</p>
      )}
      {children}
    </div>
  );
}
