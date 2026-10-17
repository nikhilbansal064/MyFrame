import * as React from "react";

const DropdownMenuContext = React.createContext({
  open: false,
  setOpen: () => {},
});

export const DropdownMenu = ({ children }) => {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef(null);

  // Click outside to close
  React.useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div ref={containerRef} className="relative inline-block text-left">
        {children}
      </div>
    </DropdownMenuContext.Provider>
  );
};

export const DropdownMenuTrigger = React.forwardRef(({ children, asChild = false, ...props }, ref) => {
  const { open, setOpen } = React.useContext(DropdownMenuContext);
  
  const handleClick = (e) => {
    setOpen(!open);
    if (children.props?.onClick) {
      children.props.onClick(e);
    }
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...props,
      ref,
      onClick: handleClick,
    });
  }

  return (
    <button
      ref={ref}
      onClick={handleClick}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
});
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

export const DropdownMenuContent = React.forwardRef(({ className = "", children, align = "right", ...props }, ref) => {
  const { open } = React.useContext(DropdownMenuContext);

  if (!open) return null;

  const alignClasses = {
    left: "left-0 origin-top-left",
    right: "right-0 origin-top-right",
    center: "left-1/2 -translate-x-1/2 origin-top",
  };

  const alignClass = alignClasses[align] || alignClasses.right;

  return (
    <div
      ref={ref}
      className={`absolute ${alignClass} mt-2 w-56 rounded-xl border border-white/8 bg-neutral-950 p-1 text-white shadow-2xl focus:outline-none z-50 glass-panel animate-in fade-in zoom-in-95 duration-100 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});
DropdownMenuContent.displayName = "DropdownMenuContent";

export const DropdownMenuItem = React.forwardRef(({ className = "", children, onClick, ...props }, ref) => {
  const { setOpen } = React.useContext(DropdownMenuContext);

  const handleClick = (e) => {
    if (onClick) onClick(e);
    setOpen(false);
  };

  return (
    <button
      ref={ref}
      type="button"
      onClick={handleClick}
      className={`flex w-full items-center rounded-lg px-3 py-2 text-sm text-neutral-300 hover:text-white hover:bg-white/5 transition-all text-left font-semibold cursor-pointer ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});
DropdownMenuItem.displayName = "DropdownMenuItem";
