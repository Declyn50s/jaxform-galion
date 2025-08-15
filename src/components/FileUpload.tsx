import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, Upload, X } from "lucide-react";

type FileLike = File;

type Props =
  & {
      /**
       * MIME types acceptés (ex: "application/pdf" ou "application/pdf,image/png").
       * Tu peux aussi passer des extensions (ex: ".pdf,.png")
       */
      accept?: string;
      /**
       * Autoriser plusieurs fichiers
       */
      multiple?: boolean;
      /**
       * Valeur contrôlée :
       *  - single: File | null | undefined
       *  - multiple: File[] | undefined
       */
      value?: FileLike | FileLike[] | null;
      /**
       * onChange contrôlé :
       *  - single: (file: File | null) => void
       *  - multiple: (files: File[]) => void
       */
      onChange: (next: any) => void;
      /**
       * Taille max d’UN fichier (en Mo). Par défaut 10.
       */
      maxSizeMB?: number;
      /**
       * Désactivé
       */
      disabled?: boolean;
      /**
       * Id pour l’input file (facultatif, sinon généré)
       */
      id?: string;
      /**
       * Libellé du bouton
       */
      buttonLabel?: string;
      /**
       * Message d’aide sous le bouton
       */
      hint?: string;
    }
  & React.HTMLAttributes<HTMLDivElement>;

export function FileUpload({
  accept = "application/pdf",
  multiple = false,
  value,
  onChange,
  maxSizeMB = 10,
  disabled = false,
  id,
  buttonLabel = "Choisir un fichier",
  hint,
  className,
  ...rest
}: Props) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Normalisation : on fabrique TOUJOURS un tableau pour l’affichage interne,
  // mais on renverra ce qu’attend le parent (single ou array).
  const filesArray: FileLike[] = React.useMemo(() => {
    if (Array.isArray(value)) return value;
    if (value instanceof File) return [value];
    return []; // null/undefined
  }, [value]);

  const openPicker = () => {
    setError(null);
    inputRef.current?.click();
  };

  const validateOne = (f: FileLike): string | null => {
    // Taille
    if (f.size > maxSizeMB * 1024 * 1024) {
      return `Le fichier « ${f.name} » dépasse ${maxSizeMB} Mo.`;
    }
    // Type (si accept utilise des extensions, on tolère ; sinon MIME strict)
    if (accept) {
      const accepts = accept.split(",").map((s) => s.trim().toLowerCase());
      const name = f.name.toLowerCase();
      const mime = f.type.toLowerCase();

      const ok = accepts.some((a) => {
        if (a.startsWith(".")) {
          // extension
          return name.endsWith(a);
        }
        // mime
        return mime === a || (a.endsWith("/*") && mime.startsWith(a.replace("/*", "/")));
      });

      if (!ok) {
        return `Type non accepté pour « ${f.name} ». Types autorisés : ${accepts.join(", ")}`;
      }
    }
    return null;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const list = e.target.files;
    if (!list || list.length === 0) return;

    const picked = Array.from(list);
    // validations
    for (const f of picked) {
      const err = validateOne(f);
      if (err) {
        setError(err);
        // ne met pas à jour la valeur si un fichier est invalide
        // (si tu préfères filtrer les mauvais et garder les bons, adapte ici)
        // On reset l'input pour autoriser re-pick du même nom
        e.target.value = "";
        return;
      }
    }

    if (multiple) {
      // cumul avec existants
      const next = [...filesArray, ...picked];
      onChange(next);
    } else {
      // single : on en prend un seul
      onChange(picked[0] ?? null);
    }

    // reset pour pouvoir re-sélectionner le même fichier
    e.target.value = "";
  };

  const removeAt = (idx: number) => {
    if (!multiple) {
      onChange(null);
      return;
    }
    const next = [...filesArray];
    next.splice(idx, 1);
    onChange(next);
  };

  const clearAll = () => {
    if (multiple) onChange([]);
    else onChange(null);
  };

  const totalSize = filesArray.reduce((acc, f) => acc + (f?.size || 0), 0);
  const prettySize = formatBytes(totalSize);

  const inputId = id || React.useId();

  return (
    <div className={className} {...rest}>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={openPicker} disabled={disabled} className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
          {buttonLabel}
        </Button>

        {filesArray.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {multiple ? `${filesArray.length} fichier(s)` : filesArray[0]?.name}
          </Badge>
        )}

        {filesArray.length > 0 && multiple && (
          <span className="text-xs text-muted-foreground">Total: {prettySize}</span>
        )}

        {filesArray.length > 0 && (
          <Button type="button" variant="ghost" size="icon" onClick={clearAll} aria-label="Effacer">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {hint && (
        <p className="text-xs text-muted-foreground mt-1">
          {hint}
        </p>
      )}

      {error && (
        <Alert variant="destructive" className="mt-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Liste détaillée en mode multiple */}
      {multiple && filesArray.length > 0 && (
        <div className="mt-2 space-y-2">
          {filesArray.map((f, i) => (
            <div key={`${f.name}-${i}`} className="flex items-center justify-between rounded-md border p-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{f.name}</div>
                <div className="text-xs text-muted-foreground">{formatBytes(f.size)}</div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeAt(i)}
                aria-label={`Supprimer ${f.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FileUpload;

// --------- utils
function formatBytes(n: number) {
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  const k = 1024;
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(k)));
  const val = n / Math.pow(k, i);
  return `${val.toFixed(val >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}
