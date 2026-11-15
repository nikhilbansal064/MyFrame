import * as React from "react";

const TabsContext = React.createContext({
  value: "",
  onValueChange: () => {},
});

export const Tabs = ({ defaultValue, value, onValueChange, className = "", children, ...props }) => {
  const [localValue, setLocalValue] = React.useState(defaultValue);
  const isControlled = value !== undefined;
  const activeValue = isControlled ? value : localValue;
  
  const handleValueChange = React.useCallback((newValue) => {
    if (!isControlled) {
      setLocalValue(newValue);
    }
    if (onValueChange) {
      onValueChange(newValue);
    }
  }, [isControlled, onValueChange]);

  return (
    <TabsContext.Provider value={{ value: activeValue, onValueChange: handleValueChange }}>
      <div className={`w-full ${className}`} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

export const TabsList = React.forwardRef(({ className = "", ...props }, ref) => (
  <div
    ref={ref}
    className={`inline-flex items-center justify-center gap-1 rounded-xl bg-white/[0.03] p-1 border border-white/[0.08] ${className}`}
    {...props}
  />
));
TabsList.displayName = "TabsList";

export const TabsTrigger = React.forwardRef(({ value, className = "", ...props }, ref) => {
  const { value: activeValue, onValueChange } = React.useContext(TabsContext);
  const isActive = activeValue === value;

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onValueChange(value)}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer ${
        isActive
          ? "bg-white/10 text-white shadow-sm"
          : "text-neutral-400 hover:text-neutral-200"
      } ${className}`}
      {...props}
    />
  );
});
TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = React.forwardRef(({ value, className = "", children, ...props }, ref) => {
  const { value: activeValue } = React.useContext(TabsContext);

  if (activeValue !== value) return null;

  return (
    <div
      ref={ref}
      className={`mt-4 focus-visible:outline-none animate-fade-in ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});
TabsContent.displayName = "TabsContent";
