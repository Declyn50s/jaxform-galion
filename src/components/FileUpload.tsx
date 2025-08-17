import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, Upload, X } from "lucide-react";

type FileLike = File;

type Props =
  & {
      accept?: string;           // ex: "application/pdf,image/*,.jpg,.jpeg,.png,.heic"
      multiple?: boolean;
      value?: FileLike | FileLike[] | null;
      onChange: (next: any) => void;
      maxSizeMB?: number;
      disabled?: boolean;
      id?: string;
      buttonLabel?: string;
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

  // Toujours un tableau pour l’affichage
  const filesArray: FileLike[] = React.useMemo(() => {
    if (Array.isArray(value)) return value;
    if (value instanceof File) return [value];
    return [];
  }, [value]);

  const openPicker = () => {
    setError(null);
    inputRef.current?.click();
  };

  // --- Validation renforcée ---

  // Normalise ".JPG" → ".jpg", "IMAGE/JPEG" → "image/jpeg"
  const acceptTokens = React.useMemo(
    () => (accept || "")
      .split(",")
      .map(s => s.trim().toLowerCase())
      .filter(Boolean),
    [accept]
  );

  // Alias MIME connus
  const MIME_ALIASES: Record<string, string[]> = {
    "image/jpeg": ["image/jpg", "image/pjpeg"],
    "application/pdf": ["application/x-pdf", "application/acrobat"],
    "image/heic": ["image/heif"], // iOS variantes
  };

  // Ext ↔ MIME basiques pour fallback
  const EXT_TO_MIME: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".heic": "image/heic",
    ".pdf": "application/pdf",
  };

  const hasWildcard = (t: string) => t.endsWith("/*");
  const tokenMatches = (token: string, fileMime: string, fileName: string) => {
    // 1) extension (".pdf", ".jpg", etc.)
    if (token.startsWith(".")) {
      return fileName.endsWith(token);
    }
    // 2) wildcard MIME ("image/*")
    if (hasWildcard(token)) {
      const prefix = token.slice(0, -1); // "image/"
      return fileMime.startsWith(prefix);
    }
    // 3) MIME exact (avec alias)
    if (fileMime === token) return true;
    const aliases = MIME_ALIASES[token];
    if (aliases?.includes(fileMime)) return true;
    return false;
  };

  const pickFileExt = (name: string) => {
    const m = name.toLowerCase().match(/\.[a-z0-9]+$/i);
    return m ? m[0] : "";
  };

  const validateOne = (f: FileLike): string | null => {
    // Taille
    if (f.size > maxSizeMB * 1024 * 1024) {
      return `Le fichier « ${f.name} » dépasse ${maxSizeMB} Mo.`;
    }

    if (acceptTokens.length === 0) return null; // rien à filtrer

    const fileName = f.name.toLowerCase();
    const fileMimeRaw = (f.type || "").toLowerCase();
    const fileExt = pickFileExt(fileName);

    // Si pas de MIME fourni par le navigateur → essaie d’inférer par l’extension
    const inferredMime = fileMimeRaw || EXT_TO_MIME[fileExt] || "";

    // Si l’un des tokens matche par ext OU par MIME (y compris wildcard/alias), c’est OK.
    const ok = acceptTokens.some(token => tokenMatches(token, inferredMime, fileName));

    if (!ok) {
      return `Type non accepté pour « ${f.name} ». Types autorisés : ${acceptTokens.join(", ")}`;
    }
    return null;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const list = e.target.files;
    if (!list || list.length === 0) return;

    const picked = Array.from(list);

    for (const f of picked) {
      const err = validateOne(f);
      if (err) {
        setError(err);
        e.target.value = ""; // permet de re-choisir le même nom
        return;
      }
    }

    if (multiple) {
      onChange([...(filesArray || []), ...picked]);
    } else {
      onChange(picked[0] ?? null);
    }

    e.target.value = "";
  };

  const removeAt = (idx: number) => {
    if (!multiple) { onChange(null); return; }
    const next = [...filesArray];
    next.splice(idx, 1);
    onChange(next);
  };

  const clearAll = () => { multiple ? onChange([]) : onChange(null); };

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

      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}

      {error && (
        <Alert variant="destructive" className="mt-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

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
