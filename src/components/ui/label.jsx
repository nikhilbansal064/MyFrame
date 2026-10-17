import * as React from "react";

export const Label = React.forwardRef(({ className = "", ...props }, ref) => (
  <label
    ref={ref}
    className={`text-sm font-semibold text-neutral-300 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 select-none ${className}`}
    {...props}
  />
));
Label.displayName = "Label";
