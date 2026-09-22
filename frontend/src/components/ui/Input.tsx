import React, { forwardRef, useId } from "react";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, helperText, error, leftIcon, rightIcon, id, required, disabled, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
            {label}
            {required && <span className="text-rose-500 ml-0.5">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={cn(
              "w-full h-10 rounded-xl border bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-150",
              "focus:outline-none focus:ring-2 focus:ring-offset-0",
              "disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed",
              error
                ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20 text-rose-900"
                : "border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-blue-500/20",
              leftIcon && "pl-10",
              rightIcon ? "pr-10" : error ? "pr-10" : "pr-3.5",
              className
            )}
            {...props}
          />

          {error ? (
            <div className="absolute right-3.5 text-rose-500 pointer-events-none flex items-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          ) : rightIcon ? (
            <div className="absolute right-3.5 text-slate-400 pointer-events-none flex items-center">
              {rightIcon}
            </div>
          ) : null}
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

Input.displayName = "Input";
