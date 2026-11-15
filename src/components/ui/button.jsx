import * as React from "react";

export const Button = React.forwardRef(({
  className = "",
  variant = "default",
  size = "default",
  asChild = false,
  children,
  ...props
}, ref) => {
  const baseStyles = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer [&_svg]:shrink-0";

  const variants = {
    default: "btn-premium text-white",
    secondary: "bg-white/[0.06] hover:bg-white/10 text-neutral-200 border border-white/[0.08] hover:border-white/15",
    outline: "border border-white/10 hover:border-white/20 bg-transparent hover:bg-white/[0.04] text-neutral-200",
    ghost: "text-neutral-400 hover:text-white hover:bg-white/[0.06]",
    "ghost-danger": "text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10",
    light: "bg-white text-neutral-950 hover:bg-neutral-200 shadow-sm",
    accent: "border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/15 hover:border-purple-500/50 text-purple-200",
    danger: "bg-rose-500/10 hover:bg-rose-500/15 text-rose-400 hover:text-rose-300 border border-rose-500/20 hover:border-rose-500/40",
  };

  const sizes = {
    default: "h-10 px-4 text-sm",
    sm: "h-8 rounded-lg px-3 text-xs",
    lg: "h-12 rounded-xl px-6 text-base",
    icon: "h-10 w-10 p-0",
    "icon-sm": "h-8 w-8 rounded-lg p-0",
    "icon-lg": "h-12 w-12 p-0",
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
