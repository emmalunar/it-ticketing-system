import { cn } from "@/lib/cn";

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  count?: number;
};

type SegmentedProps<T extends string> = {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
};

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: SegmentedProps<T>) {
  return (
    <div className={cn("segmented", className)} role="group" aria-label={ariaLabel}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            className={cn("segmented__item", active && "is-active")}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
          >
            {option.label}
            {typeof option.count === "number" ? (
              <span className="segmented__count">{option.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
