import * as React from "react";
import { X } from "lucide-react";

const DialogContext = React.createContext({
  open: false,
  setOpen: () => {},
});

export const Dialog = ({ children, open: controlledOpen, onOpenChange }) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = React.useCallback((value) => {
    if (!isControlled) {
      setUncontrolledOpen(value);
    }
    if (onOpenChange) {
      onOpenChange(value);
    }
  }, [isControlled, onOpenChange]);

  // Handle Escape key close
  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, setOpen]);

  return (
    <DialogContext.Provider value={{ open, setOpen }}>
      {children}
    </DialogContext.Provider>
  );
};

export const DialogTrigger = React.forwardRef(({ children, asChild = false, ...props }, ref) => {
  const { setOpen } = React.useContext(DialogContext);
  
  const handleClick = (e) => {
    setOpen(true);
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
DialogTrigger.displayName = "DialogTrigger";

export const DialogClose = React.forwardRef(({ children, asChild = false, ...props }, ref) => {
  const { setOpen } = React.useContext(DialogContext);
  
  const handleClick = (e) => {
    setOpen(false);
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
DialogClose.displayName = "DialogClose";

export const DialogContent = React.forwardRef(({ className = "", children, ...props }, ref) => {
  const { open, setOpen } = React.useContext(DialogContext);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Backdrop Click */}
      <div className="fixed inset-0" onClick={() => setOpen(false)} />

      {/* Modal Container */}
      <div
        ref={ref}
        className={`relative w-full max-w-lg bg-neutral-900 border border-white/8 shadow-2xl rounded-3xl p-6 sm:p-8 flex flex-col gap-6 animate-in zoom-in-95 duration-200 glass-panel ${className}`}
        {...props}
      >
        {/* Close Button */}
        <button
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 p-2 border border-white/5 hover:border-white/10 bg-white/5 hover:bg-white/10 rounded-xl text-neutral-400 hover:text-white transition-all cursor-pointer z-50"
        >
          <X className="w-4 h-4" />
        </button>

        {children}
      </div>
    </div>
  );
});
DialogContent.displayName = "DialogContent";

export const DialogHeader = ({ className = "", ...props }) => (
  <div
    className={`flex flex-col space-y-1.5 text-center sm:text-left ${className}`}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

export const DialogFooter = ({ className = "", ...props }) => (
  <div
    className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 ${className}`}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

export const DialogTitle = React.forwardRef(({ className = "", ...props }, ref) => (
  <h2
    ref={ref}
    className={`text-xl font-bold tracking-tight text-white ${className}`}
    {...props}
  />
));
DialogTitle.displayName = "DialogTitle";

export const DialogDescription = React.forwardRef(({ className = "", ...props }, ref) => (
  <p
    ref={ref}
    className={`text-sm text-neutral-400 ${className}`}
    {...props}
  />
));
DialogDescription.displayName = "DialogDescription";
