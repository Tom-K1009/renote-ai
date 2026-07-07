type OptionGroupProps<T extends string | number> = {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  compact?: boolean;
};

export function OptionGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
  compact = false
}: OptionGroupProps<T>) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
        {label}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = option === value;

          return (
            <button
              key={String(option)}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option)}
              className={`rounded-full border px-3 font-medium transition duration-200 active:scale-[0.98] ${
                compact ? "min-h-9 text-xs" : "min-h-10 text-sm"
              } ${
                active
                  ? "border-zinc-950 bg-zinc-950 text-white shadow-sm dark:border-white dark:bg-white dark:text-zinc-950"
                  : "border-zinc-200 bg-white/70 text-zinc-700 hover:border-zinc-400 hover:bg-white dark:border-zinc-800 dark:bg-white/5 dark:text-zinc-200 dark:hover:border-zinc-600"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
