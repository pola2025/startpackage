import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps extends Omit<React.ComponentProps<"input">, "size"> {
  size?: "sm" | "default" | "lg";
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, size = "default", ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex w-full rounded-lg border-2 border-input bg-white font-medium text-foreground transition-all file:border-0 file:bg-transparent file:font-medium file:text-foreground placeholder:text-muted-foreground/60 hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50",
          // Size variants
          size === "sm" && "h-8 px-3 py-1.5 text-xs file:text-xs",
          size === "default" && "h-10 px-4 py-2.5 text-sm file:text-sm",
          size === "lg" && "h-12 px-5 py-3 text-base file:text-base",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
