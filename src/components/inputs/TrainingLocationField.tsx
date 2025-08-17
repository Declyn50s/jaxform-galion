// src/components/inputs/TrainingLocationField.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  id?: string;
  label?: string;
  value?: string;
  onChange: (next: string) => void;
  onValidate?: (isValid: boolean) => void; // ex. pour afficher ✅
  required?: boolean;
  communesCOREL: readonly string[];
  maxSuggestions?: number; // 5–7; défaut 7
};

// Options spéciales demandées
const SPECIAL_OPTIONS = [
  "En ligne / Distanciel",
  "Hybride (présentiel + distanciel)",
] as const;

// Normalisation : accents/majuscules
const normalize = (s: string) =>
  s
    .normalize("NFD")
    // @ts-ignore – fallback unicode diacritics
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

// Levenshtein simple (suffisant pour heuristique « ~3 secondes »)
const levenshtein = (a: string, b: string) => {
  const m = a.length,
    n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array(n + 1).fill(0)
  ) as number[][];
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // del
        dp[i][j - 1] + 1, // ins
        dp[i - 1][j - 1] + cost // sub
      );
    }
  }
  return dp[m][n];
};

// Scoring fuzzy : priorité au « startsWith », puis « includes », puis distance
const fuzzyScore = (q: string, target: string) => {
  const nq = normalize(q);
  const nt = normalize(target);
  if (!nq) return 999; // bascule bas si pas de requête
  if (nt.startsWith(nq)) return 0;
  const idx = nt.indexOf(nq);
  if (idx !== -1) return 1 + idx; // favorise occurences tôt
  // distance normalisée
  const dist = levenshtein(nq, nt);
  return 100 + dist / Math.max(1, nt.length);
};

export default function TrainingLocationField({
  id = "training-location",
  label = "Lieu de formation",
  value,
  onChange,
  onValidate,
  required = true,
  communesCOREL,
  maxSuggestions = 7,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value ?? "");
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const normalizedCOREL = useMemo(() => communesCOREL.map(normalize), [communesCOREL]);

  const baseSuggestions = useMemo(() => {
    // Tri fuzzy sur COREL + cap à 5–7 éléments
    const scored = communesCOREL
      .map((c) => ({ label: c, score: fuzzyScore(query, c), type: "corel" as const }))
      .sort((a, b) => a.score - b.score)
      .slice(0, Math.max(5, Math.min(7, maxSuggestions)));

    // Injecte options spéciales (toujours visibles, mais à la fin; si requête match => elles remontent)
    const specials = SPECIAL_OPTIONS.map((s) => ({
      label: s,
      score: fuzzyScore(query, s),
      type: "special" as const,
    }));

    return [...scored, ...specials].sort((a, b) => a.score - b.score);
  }, [communesCOREL, query, maxSuggestions]);

  const noSuggestions = baseSuggestions.length === 0;

  const isEmptyError = required && !query.trim();

  const isCOREL = useMemo(() => {
    if (!query.trim()) return false;
    const n = normalize(query);
    return normalizedCOREL.includes(n);
  }, [query, normalizedCOREL]);

  // Validation externe (✅ quand non vide)
  useEffect(() => {
    onValidate?.(!isEmptyError);
  }, [isEmptyError, onValidate]);

  useEffect(() => {
    setQuery(value ?? "");
  }, [value]);

  const commitSelection = (label: string) => {
    onChange(label);
    setQuery(label);
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.blur();
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setOpen(true);
        setActiveIndex((i) => Math.min(i + 1, baseSuggestions.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setOpen(true);
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        if (open && activeIndex >= 0 && baseSuggestions[activeIndex]) {
          e.preventDefault();
          commitSelection(baseSuggestions[activeIndex].label);
        } else {
          // Saisie manuelle
          commitSelection(query.trim());
        }
        break;
      case "Escape":
        setOpen(false);
        setActiveIndex(-1);
        break;
    }
  };

  // Fermeture en blur (avec léger délai pour autoriser clic dans la liste)
  const handleBlur: React.FocusEventHandler<HTMLInputElement> = () => {
    setTimeout(() => setOpen(false), 120);
  };

  const fieldBorder =
    isEmptyError
      ? "border-red-500 focus:ring-red-500"
      : "border-input focus:ring-blue-500";

  return (
    <div className="relative">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium mb-1">
          {label}
        </label>
      )}

      <div
        className={`flex items-center gap-2 rounded-xl border px-3 py-2 focus-within:ring-2 ${fieldBorder} bg-white`}
      >
        <span aria-hidden>📍</span>
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="text"
          autoComplete="off"
          placeholder="Tapez ici…"
          className="w-full outline-none bg-transparent text-base"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-listbox`}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined
          }
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
        />
        {!isEmptyError && query.trim() && (
          <span aria-label="validé" title="Valeur validée">✅</span>
        )}
      </div>

      {/* Liste des suggestions */}
      {open && (
        <ul
          ref={listRef}
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-50 mt-1 w-full bg-white border rounded-xl shadow-lg max-h-60 overflow-auto"
        >
          {baseSuggestions.map((s, idx) => {
            const isActive = idx === activeIndex;
            return (
              <li
                id={`${id}-option-${idx}`}
                role="option"
                aria-selected={isActive}
                key={`${s.type}-${s.label}`}
                tabIndex={-1}
                className={`px-3 py-2 cursor-pointer text-sm ${
                  isActive ? "bg-blue-50" : "hover:bg-gray-50"
                }`}
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => commitSelection(s.label)}
              >
                {s.label}
                {s.type !== "corel" && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    (option spéciale)
                  </span>
                )}
              </li>
            );
          })}

          {/* Fallback : Ajouter manuellement */}
          {(!query.trim() || baseSuggestions.every(s => normalize(s.label) !== normalize(query))) && (
            <li
              role="option"
              aria-selected={false}
              className="px-3 py-2 cursor-pointer text-sm hover:bg-gray-50 border-t"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => commitSelection(query.trim())}
              id={`${id}-option-manual`}
            >
              ➕ Ajouter manuellement « {query.trim() || "…" } »
            </li>
          )}
        </ul>
      )}

      {/* Erreurs / aides */}
      <div className="mt-1 space-y-1">
        {isEmptyError && (
          <p className="text-xs text-red-600">
            Le champ « Lieu de formation » est obligatoire.
          </p>
        )}
        {!!query && !isCOREL && (
          <p className="text-xs text-amber-700">
            Lieu hors COREL : non éligible aux conditions étudiantes.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Si apprentissage, seul le <strong>lieu de l’apprentissage</strong> fait foi.
        </p>
      </div>
    </div>
  );
}
