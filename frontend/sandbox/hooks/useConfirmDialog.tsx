"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import ConfirmDialog from "../components/ConfirmDialog";

type Variant = "danger" | "warning" | "info";

interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: Variant;
  onConfirm: () => Promise<void> | void;
}

interface ConfirmDialogContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextValue | null>(null);

interface ConfirmDialogProviderProps {
  children: ReactNode;
}

export function ConfirmDialogProvider({ children }: ConfirmDialogProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setOptions(opts);
      setIsOpen(true);
      setResolver(() => resolve);
    });
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!options || !resolver) return;

    setIsOpen(false);
    try {
      await options.onConfirm();
      resolver(true);
    } catch {
      resolver(false);
    } finally {
      setResolver(null);
      setOptions(null);
    }
  }, [options, resolver]);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    if (resolver) {
      resolver(false);
      setResolver(null);
      setOptions(null);
    }
  }, [resolver]);

  const contextValue = { confirm };
  const { Provider } = ConfirmDialogContext;

  return (
    <Provider value={contextValue}>
      {children}
      {options && (
        <ConfirmDialog
          open={isOpen}
          title={options.title}
          description={options.description}
          confirmLabel={options.confirmLabel}
          cancelLabel={options.cancelLabel}
          variant={options.variant || "info"}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
       )}
     </Provider>
   );
}

export function useConfirmDialog(): ConfirmDialogContextValue {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error("useConfirmDialog must be used within a ConfirmDialogProvider");
  }
  return context;
}
