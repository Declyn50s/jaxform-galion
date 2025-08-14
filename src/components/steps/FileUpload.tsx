// src/components/FileUpload.tsx
import React, { useId, useMemo, useRef } from 'react';

type MaybeFile = File | { name?: string; size?: number } | string | null | undefined;
type FileUploadValue = MaybeFile | MaybeFile[];

type Props = {
  value?: FileUploadValue;
  onChange: (next: File | File[] | null) => void;
  accept?: string | string[];
  multiple?: boolean;
  disabled?: boolean;
};

export function FileUpload({
  value,
  onChange,
  accept = 'application/pdf',
  multiple = false,
  disabled = false,
}: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  // 🛡️ Normalise en tableau de File (ignore tout ce qui n'est pas un File)
  const filesArr = useMemo<File[]>(() => {
    if (value == null) return [];
    if (Array.isArray(value)) return value.filter((x): x is File => x instanceof File);
    return value instanceof File ? [value] : [];
  }, [value]);

  const acceptAttr = Array.isArray(accept) ? accept.join(',') : accept;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files ? Array.from(e.target.files) : [];
    onChange(multiple ? selected : (selected[0] ?? null));
  };

  const clear = () => {
    onChange(multiple ? [] : null);
    // Permet de re-sélectionner le même fichier immédiatement
    if (inputRef.current) inputRef.current.value = '';
  };

  // Pas de reduce ⇒ aucun risque si tableau vide
  let totalSize = 0;
  for (const f of filesArr) totalSize += f?.size ?? 0;

  // (optionnel) debug: décommente si besoin
  // console.log('[FileUpload]', { value, filesArr, totalSize });

  return (
    <div className="space-y-2">
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={acceptAttr}
        multiple={multiple}
        onChange={handleChange}
        disabled={disabled}
        className="hidden"
      />
      <label htmlFor={inputId} className="inline-flex items-center px-3 py-2 border rounded-md cursor-pointer">
        Choisir un fichier
      </label>

      {filesArr.length > 0 && (
        <div className="text-xs text-muted-foreground">
          {filesArr.map((f, i) => (
            <div key={i}>
              {f.name} — {(f.size / 1024).toFixed(1)} KB
            </div>
          ))}
          <button type="button" onClick={clear} className="underline">Retirer</button>
          <div>Total: {(totalSize / 1024).toFixed(1)} KB</div>
        </div>
      )}
    </div>
  );
}
