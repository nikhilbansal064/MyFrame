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

export const DialogContent = React.forwardRef(({ className = "", flush = false, children, ...props }, ref) => {
  const { open, setOpen } = React.useContext(DialogContext);

  // Lock page scroll while the modal is open
  React.useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={() => setOpen(false)}
      />

      {/* Modal Container */}
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        className={`relative w-full ${className.includes("max-w-") ? "" : "max-w-lg"} max-h-[92vh] overflow-y-auto bg-neutral-950 border border-white/10 shadow-2xl shadow-black/60 rounded-t-3xl sm:rounded-2xl flex flex-col animate-scale-in ${flush ? "" : "p-6 sm:p-8 gap-6"} ${className}`}
        {...props}
      >
        {/* Close Button */}
        <button
          type="button"
          aria-label="Close"
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 inline-flex items-center justify-center w-8 h-8 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer z-10"
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
    className={`flex flex-col gap-1.5 ${className}`}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

export const DialogFooter = ({ className = "", ...props }) => (
  <div
    className={`flex flex-col-reverse sm:flex-row sm:justify-end gap-3 ${className}`}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

export const DialogTitle = React.forwardRef(({ className = "", ...props }, ref) => (
  <h2
    ref={ref}
    className={`text-lg font-semibold tracking-tight text-white ${className}`}
    {...props}
  />
));
DialogTitle.displayName = "DialogTitle";

export const DialogDescription = React.forwardRef(({ className = "", ...props }, ref) => (
  <p
    ref={ref}
    className={`text-sm text-neutral-400 leading-relaxed ${className}`}
    {...props}
  />
));
DialogDescription.displayName = "DialogDescription";
