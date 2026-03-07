"use client";

import React, { forwardRef, useId } from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
}

const GenericInput = forwardRef<HTMLInputElement, InputProps>(
  ({ type = "text", placeholder, value, onChange, className = "", label, error, id, name, ...rest }, ref) => {
    const autoId = useId();
    const inputId = id ?? name ?? autoId;

    return (
      <div className="w-full flex justify-center">
        <div className="w-full max-w-md">
          {label && (
            <label
              htmlFor={inputId}
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              {label}
            </label>
          )}

          <div className="relative">
            <input
              id={inputId}
              name={name}
              ref={ref}
              type={type}
              placeholder={placeholder}
              value={value}
              onChange={onChange}
              aria-invalid={!!error}
              aria-describedby={error ? `${inputId}-error` : undefined}
              className={`block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-indigo-400 transition-shadow duration-150 caret-indigo-600 ${
                error ? "border-rose-500 ring-rose-100" : "hover:shadow-md"
              } ${className}`}
              {...rest}
            />
          </div>

          {error ? (
            <p id={`${inputId}-error`} className="mt-2 text-sm text-rose-600">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    );
  }
);

GenericInput.displayName = "Input";

export default GenericInput;
