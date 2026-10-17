import * as React from "react";

export const Button = React.forwardRef(({ 
  className = "", 
  variant = "default", 
  size = "default", 
  asChild = false, 
  children,
  ...props 
}, ref) => {
  const baseStyles = "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer";
  
  const variants = {
    default: "btn-premium text-white",
    secondary: "bg-white/5 hover:bg-white/10 text-neutral-200 border border-white/8 hover:border-white/15",
    outline: "border border-white/8 hover:border-purple-500/40 hover:bg-purple-500/5 text-neutral-300",
    ghost: "text-neutral-400 hover:text-white hover:bg-white/5",
    accent: "bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/15",
    danger: "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20",
  };

  const sizes = {
    default: "h-10 px-4 py-2 text-sm",
    sm: "h-8 rounded-lg px-3 py-1.5 text-xs",
    lg: "h-12 rounded-2xl px-8 py-3 text-base",
    icon: "h-10 w-10 p-0",
  };

  const variantClass = variants[variant] || variants.default;
  const sizeClass = sizes[size] || sizes.default;

  return (
    <button
      ref={ref}
      className={`${baseStyles} ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = "Button";
