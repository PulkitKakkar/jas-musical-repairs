"use client";

import { useEffect, useRef, useState } from "react";

type Suggestion = {
  value: string;
  label: string;
  detail: string;
};

export function SearchAutocomplete({
  name,
  defaultValue,
  placeholder,
  scope,
  className = "input",
  required = false,
  submitOnSelect = false,
}: {
  name: string;
  defaultValue?: string;
  placeholder: string;
  scope: "repairs" | "customers" | "instruments" | "hires";
  className?: string;
  required?: boolean;
  submitOnSelect?: boolean;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || value.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const response = await fetch(`/api/admin/search?scope=${scope}&q=${encodeURIComponent(value)}`, { signal: controller.signal });
      if (response.ok) {
        const result = await response.json();
        setSuggestions(result.suggestions ?? []);
      }
    }, 200);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, scope, value]);

  function select(suggestion: Suggestion) {
    setValue(suggestion.value);
    setSuggestions([]);
    setOpen(false);
    if (submitOnSelect) {
      window.setTimeout(() => inputRef.current?.form?.requestSubmit(), 0);
    }
  }

  return (
    <div className="relative min-w-0 flex-1">
      <input
        autoComplete="off"
        className={className}
        name={name}
        onBlur={() => window.setTimeout(() => setOpen(false), 100)}
        onChange={(event) => { setValue(event.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        ref={inputRef}
        required={required}
        value={value}
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-auto border border-black/10 bg-white text-left shadow-xl">
          {suggestions.map((suggestion) => (
            <button className="block w-full border-b border-black/5 px-4 py-3 text-left hover:bg-brand-50" key={`${suggestion.value}-${suggestion.detail}`} onMouseDown={(event) => event.preventDefault()} onClick={() => select(suggestion)} type="button">
              <span className="block text-sm font-bold">{suggestion.label}</span>
              <span className="block text-xs text-ink/50">{suggestion.detail}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
