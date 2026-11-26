import { useId } from "react";
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";
import { SearchIcon } from "./icons";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  optional = false,
  className,
  children,
}: {
  label?: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string | null;
  optional?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("field", className)}>
      {label ? (
        <label className="field__label" htmlFor={htmlFor}>
          {label}
          {optional ? <span className="field__optional">Optional</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="field__error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="field__hint">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn("input", className)} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn("select", className)} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn("textarea", className)} />;
}

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  optional?: boolean;
  containerClassName?: string;
};

export function TextField({
  label,
  hint,
  error,
  optional,
  containerClassName,
  id,
  ...props
}: TextFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <Field
      label={label}
      htmlFor={fieldId}
      hint={hint}
      error={error}
      optional={optional}
      className={containerClassName}
    >
      <Input id={fieldId} aria-invalid={error ? true : undefined} {...props} />
    </Field>
  );
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  optional?: boolean;
  containerClassName?: string;
  children: ReactNode;
};

export function SelectField({
  label,
  hint,
  error,
  optional,
  containerClassName,
  id,
  children,
  ...props
}: SelectFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <Field
      label={label}
      htmlFor={fieldId}
      hint={hint}
      error={error}
      optional={optional}
      className={containerClassName}
    >
      <Select id={fieldId} aria-invalid={error ? true : undefined} {...props}>
        {children}
      </Select>
    </Field>
  );
}

type TextareaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  optional?: boolean;
  containerClassName?: string;
};

export function TextareaField({
  label,
  hint,
  error,
  optional,
  containerClassName,
  id,
  ...props
}: TextareaFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <Field
      label={label}
      htmlFor={fieldId}
      hint={hint}
      error={error}
      optional={optional}
      className={containerClassName}
    >
      <Textarea id={fieldId} aria-invalid={error ? true : undefined} {...props} />
    </Field>
  );
}

type SearchInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  containerClassName?: string;
};

export function SearchInput({ label, containerClassName, className, ...props }: SearchInputProps) {
  return (
    <div className={cn("search-field", containerClassName)}>
      <SearchIcon size={15} />
      <input
        {...props}
        type="search"
        aria-label={label}
        className={cn("input", className)}
      />
    </div>
  );
}
