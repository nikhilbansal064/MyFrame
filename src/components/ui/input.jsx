import * as React from "react";

export const inputStyles = "flex w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 text-sm text-white placeholder:text-neutral-500 hover:border-white/15 focus-visible:outline-none focus-visible:border-purple-500/60 focus-visible:ring-4 focus-visible:ring-purple-500/15 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200";

export const Input = React.forwardRef(({ className = "", type = "text", ...props }, ref) => {
  return (
    <input
      type={type}
      ref={ref}
      className={`${inputStyles} h-11 file:border-0 file:bg-transparent file:text-sm file:font-medium ${className}`}
      {...props}
    />
  );
});
Input.displayName = "Input";

export const Textarea = React.forwardRef(({ className = "", ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={`${inputStyles} min-h-24 py-3 leading-relaxed resize-none ${className}`}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";
