import React, { useRef, useState } from 'react';
import { Upload, File, X, Eye, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { validateFileUpload, generateUploadFilename } from '@/lib/helpers';
import { Upload as UploadType } from '@/types/form';

interface FileUploadProps {
  files: UploadType[];
  onChange: (files: UploadType[]) => void;
  accept?: string;
  maxFiles?: number;
  maxTotalSize?: number; // in bytes
  disabled?: boolean;
  memberInfo?: { nom: string; prenom: string };
  docType?: string;
  showExample?: boolean;
  onShowExample?: () => void;
  required?: boolean;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

export function FileUpload({
  files,
  onChange,
  accept = '.pdf',
  maxFiles = 10,
  maxTotalSize = 30 * 1024 * 1024, // 30MB
  disabled = false,
  memberInfo,
  docType = '',
  showExample = false,
  onShowExample,
  required = false,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string>('');

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: UploadType[] = [];
    let hasError = false;

    Array.from(selectedFiles).forEach((file, index) => {
      const validation = validateFileUpload(file);
      
      if (!validation.valid) {
        setError(validation.error || 'Erreur de validation');
        hasError = true;
        return;
      }

      if (files.length + newFiles.length >= maxFiles) {
        setError(`Maximum ${maxFiles} fichiers autorisés`);
        hasError = true;
        return;
      }

      if (totalSize + file.size > maxTotalSize) {
        setError('Taille totale des fichiers trop importante (max 30 Mo)');
        hasError = true;
        return;
      }

      const fileName = memberInfo ? 
        generateUploadFilename(memberInfo, docType, files.length + newFiles.length + 1) :
        file.name;

      newFiles.push({
        id: `${Date.now()}-${index}`,
        name: fileName,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        status: 'success'
      });
    });

    if (!hasError) {
      setError('');
      onChange([...files, ...newFiles]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    if (disabled) return;
    
    handleFileSelect(e.dataTransfer.files);
  };

  const handleRemoveFile = (fileId: string) => {
    onChange(files.filter(f => f.id !== fileId));
    setError('');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragOver 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/25 hover:border-primary/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => !disabled && fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label={ariaLabel || 'Zone de dépôt de fichiers'}
        aria-describedby={ariaDescribedBy}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
      >
        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <div className="space-y-2">
          <p className="text-sm font-medium">
            Glissez vos fichiers ici ou cliquez pour sélectionner
          </p>
          <p className="text-xs text-muted-foreground">
            PDF uniquement, max {formatFileSize(5 * 1024 * 1024)} par fichier
          </p>
          <p className="text-xs text-muted-foreground">
            Total utilisé: {formatFileSize(totalSize)} / {formatFileSize(maxTotalSize)}
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={maxFiles > 1}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={disabled}
          aria-required={required}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || files.length >= maxFiles}
        >
          <Upload className="h-4 w-4 mr-2" />
          Ajouter fichiers
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange([])}
          disabled={disabled || files.length === 0}
        >
          Tout supprimer
        </Button>
        
        {showExample && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onShowExample}
            className="ml-auto"
          >
            <Eye className="h-4 w-4 mr-2" />
            Voir exemple
          </Button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive" role="alert" aria-live="polite">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Fichiers sélectionnés :</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 border rounded-lg bg-background"
              >
                <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {file.status === 'success' && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFile(file.id)}
                    disabled={disabled}
                    aria-label={`Supprimer ${file.name}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}