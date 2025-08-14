import React, { useEffect, useMemo, useRef, useState } from "react";
import { COUNTRIES } from "@/data/countries";

// Remplace par ta propre util si tu n'as pas cn()
const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

export type Nationality = { iso: string; name: string; emoji: string };

type Props = {
  value?: { iso: string; name?: string } | string; // "CH" ou {iso:"CH", name:"Suisse"}
  onChange: (nat: Nationality | null) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  ariaLabel?: string;
  // Personnalisation (Tailwind)
  className?: string;
  inputClassName?: string;
  listClassName?: string;
  itemClassName?: string;
  emptyLabel?: string;
};

const normalize = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

export default function NationalityAutocomplete({
  value,
  onChange,
  placeholder = "Rechercher une nationalité…",
  label = "Nationalité",
  disabled,
  ariaLabel,
  className,
  inputClassName,
  listClassName,
  itemClassName,
  emptyLabel = "Aucune correspondance",
}: Props) {
  const initialIso = typeof value === "string" ? value : value?.iso;

  const [input, setInput] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  // Sync affichage quand value change de l'extérieur
  useEffect(() => {
    if (!initialIso) {
      setInput("");
      return;
    }
    const found = COUNTRIES.find((c) => c.iso === initialIso);
    setInput(found ? `${found.name} (${found.iso})` : initialIso);
  }, [initialIso]);

  // Suggestions filtrées (nom FR + code ISO2)
const suggestions: Nationality[] = useMemo(() => {
  const q = normalize(input).replace(/\([A-Z]{2}\)\s*$/, "").trim();
  return COUNTRIES
    .filter((x) => {
      if (!q) return true;
      const byName = normalize(x.name).includes(q);
      const byIso = x.iso.toLowerCase().includes(q);
      return byName || byIso;
    })
    .sort((a, b) => {
      if (a.iso === "CH") return -1;
      if (b.iso === "CH") return 1;
      return a.name.localeCompare(b.name, "fr");
    });
}, [input]);

  // Sélection
  const selectNat = (nat: Nationality | null) => {
    setOpen(false);
    setHighlight(0);
    if (nat) setInput(`${nat.name} (${nat.iso})`);
    onChange(nat);
  };

  // Click-outside
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Clavier
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const nat = suggestions[highlight];
      if (nat) selectNat(nat);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {label && <label className="block text-sm font-medium mb-1">{label}</label>}

      {/* Champ texte (combobox) */}
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls="nat-listbox"
        aria-autocomplete="list"
        aria-label={ariaLabel || label}
        disabled={disabled}
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setOpen(true);
          setHighlight(0);
          if (!e.target.value) onChange(null);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className={cn(
          "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring",
          inputClassName
        )}
        placeholder={placeholder}
        autoComplete="off"
      />

      {/* Suggestions en <ul><li> */}
      {open && (
        <ul
          id="nat-listbox"
          role="listbox"
          className={cn(
            "absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover p-1 shadow-lg",
            listClassName
          )}
        >
          {suggestions.length === 0 && (
            <li className="px-3 py-2 text-sm text-muted-foreground select-none">{emptyLabel}</li>
          )}
          {suggestions.map((s, i) => (
            <li
              key={s.iso}
              role="option"
              aria-selected={i === highlight}
              onMouseEnter={() => setHighlight(i)}
              onMouseDown={(e) => e.preventDefault()} // éviter blur avant click
              onClick={() => selectNat(s)}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-sm",
                i === highlight ? "bg-accent" : "hover:bg-accent/60",
                itemClassName
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{s.emoji}</span>
                <span className="font-medium">{s.name}</span>
              </div>
              <span className="text-xs text-muted-foreground">{s.iso}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
