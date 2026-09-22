import React from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "info" | "success" | "warning" | "error";
  title?: string;
  onClose?: () => void;
}

const variantStyles: Record<
  NonNullable<AlertProps["variant"]>,
  { container: string; icon: string; iconComponent: React.ComponentType<{ className?: string }> }
> = {
  info: {
    container: "bg-blue-50/80 border-blue-200 text-blue-900",
    icon: "text-blue-600",
    iconComponent: Info,
  },
  success: {
    container: "bg-emerald-50/80 border-emerald-200 text-emerald-900",
    icon: "text-emerald-600",
    iconComponent: CheckCircle2,
  },
  warning: {
    container: "bg-amber-50/80 border-amber-200 text-amber-900",
    icon: "text-amber-600",
    iconComponent: AlertTriangle,
  },
  error: {
    container: "bg-rose-50/80 border-rose-200 text-rose-900",
    icon: "text-rose-600",
    iconComponent: AlertCircle,
  },
};

export function Alert({
  className,
  variant = "info",
  title,
  children,
  onClose,
  ...props
}: AlertProps) {
  const config = variantStyles[variant];
  const Icon = config.iconComponent;

  return (
    <div
      role="alert"
      className={cn("flex items-start gap-3 p-4 rounded-xl border transition-all text-sm", config.container, className)}
      {...props}
    >
      <Icon className={cn("w-5 h-5 shrink-0 mt-0.5", config.icon)} />
      <div className="flex-1">
        {title && <h5 className="font-semibold mb-0.5">{title}</h5>}
        <div className="text-xs leading-relaxed text-slate-700">{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors -mr-1 -mt-1"
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
