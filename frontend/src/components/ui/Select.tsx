import React, { forwardRef, useId } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, AlertCircle } from "lucide-react";

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
  options?: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, helperText, error, options, id, required, disabled, children, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id || generatedId;
    const errorId = `${selectId}-error`;
    const helperId = `${selectId}-helper`;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
            {label}
            {required && <span className="text-rose-500 ml-0.5">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={cn(
              "w-full h-10 rounded-xl border bg-white px-3.5 pr-10 text-sm text-slate-900 appearance-none cursor-pointer transition-all duration-150",
              "focus:outline-none focus:ring-2 focus:ring-offset-0",
              "disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed",
              error
                ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20 text-rose-900"
                : "border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-blue-500/20",
              className
            )}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          <div className="absolute right-3.5 text-slate-400 pointer-events-none flex items-center">
            {error ? <AlertCircle className="w-4 h-4 text-rose-500" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>

        {error && (
          <p id={errorId} className="text-xs text-rose-600 font-medium flex items-center gap-1 mt-1 animate-in fade-in duration-150">
            {error}
          </p>
        )}

        {!error && helperText && (
          <p id={helperId} className="text-xs text-slate-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
