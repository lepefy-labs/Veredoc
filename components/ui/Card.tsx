import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "sm" | "md" | "lg";
}

const paddingClasses = { sm: "p-4", md: "p-6", lg: "p-8" };

export default function Card({ padding = "md", children, className = "", ...props }: CardProps) {
  return (
    <div
      className={`bg-white rounded-xl border border-[#E2E8F0] shadow-sm ${paddingClasses[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
