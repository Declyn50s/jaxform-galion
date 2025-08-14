// src/components/FileUpload.tsx
// [FileUpload v2-no-reduce]
import React, { useId, useMemo, useRef, useEffect } from 'react';

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

  // Sanity log pour vérifier la version réellement chargée
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[FileUpload] version: v2-no-reduce');
  }, []);

  // Normalise en tableau de File (ignore tout ce qui n'est pas un File)
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
    if (inputRef.current) inputRef.current.value = ''; // permet de re-sélectionner le même fichier
  };

  // Calcule la taille totale sans reduce
  let totalSize = 0;
  for (const f of filesArr) totalSize += f?.size ?? 0;

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
      <label
        htmlFor={inputId}
        className="inline-flex items-center px-3 py-2 border rounded-md cursor-pointer"
      >
        Choisir {multiple ? 'des fichiers' : 'un fichier'}
      </label>

      {filesArr.length > 0 && (
        <div className="text-xs text-muted-foreground space-y-1">
          {filesArr.map((f, i) => (
            <div key={i}>
              {f.name} — {(f.size / 1024).toFixed(1)} KB
            </div>
          ))}
          <div>Total: {(totalSize / 1024).toFixed(1)} KB</div>
          <button type="button" onClick={clear} className="underline">
            Retirer
          </button>
        </div>
      )}
    </div>
  );
}
