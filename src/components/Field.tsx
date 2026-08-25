import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { IconChevronDown, IconSearch } from './icons';

/* Form controls. Every one of them wires label -> control -> error through real
   ids and aria-describedby, because a CRM is 60% forms and screen-reader users
   should not have to guess which message belongs to which field. */

const CONTROL = cn(
  'w-full rounded border border-ink-150 bg-surface-card px-2.5 text-base text-ink-900',
  'placeholder:text-ink-300',
  'motion-safe:transition-colors motion-safe:duration-150',
  'hover:border-ink-300',
  'disabled:cursor-not-allowed disabled:bg-surface-app disabled:text-ink-300',
  'aria-[invalid=true]:border-danger-600',
);

export interface FieldProps {
  label: string;
  /** Visually hides the label but keeps it for assistive tech. */
  hideLabel?: boolean;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
}

export function Field({ label, hideLabel, hint, error, required, className, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={id}
        className={cn(
          'text-xs font-medium text-ink-500',
          hideLabel && 'sr-only',
        )}
      >
        {label}
        {required && (
          <span className="ml-0.5 text-accent-500" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {children({ id, describedBy: describedBy || undefined, invalid: Boolean(error) })}

      {hint && !error && (
        <p id={hintId} className="text-xs text-ink-300">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs font-medium text-danger-600">
          {error}
        </p>
      )}
    </div>
  );
}

/* --- bare controls (use inside <Field>, or standalone when labelled elsewhere) */

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(CONTROL, 'h-9', className)} {...props} />;
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, rows = 4, ...props }, ref) {
    return <textarea ref={ref} rows={rows} className={cn(CONTROL, 'py-2 leading-relaxed', className)} {...props} />;
  },
);

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Convenience: pass options instead of children. */
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, options, placeholder, children, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(CONTROL, 'h-9 appearance-none pr-8', className)}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        {children}
      </select>
      <IconChevronDown
        size={16}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-300"
      />
    </div>
  );
});

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { className, label, id, ...props },
  ref,
) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <div className="flex items-center gap-2">
      <input
        ref={ref}
        id={inputId}
        type="checkbox"
        className={cn(
          'h-4 w-4 cursor-pointer rounded-[3px] border-ink-150 text-accent-500',
          'accent-[rgb(var(--color-accent-500))]',
          className,
        )}
        {...props}
      />
      {label && (
        <label htmlFor={inputId} className="cursor-pointer select-none text-base text-ink-700">
          {label}
        </label>
      )}
    </div>
  );
});

/** Search box with a leading glyph — used by every list view and the command bar. */
export const SearchInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function SearchInput({ className, placeholder = 'Search…', ...props }, ref) {
    return (
      <div className="relative">
        <IconSearch
          size={16}
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-300"
        />
        <input
          ref={ref}
          type="search"
          placeholder={placeholder}
          className={cn(CONTROL, 'h-9 pl-8', '[&::-webkit-search-cancel-button]:hidden', className)}
          {...props}
        />
      </div>
    );
  },
);
