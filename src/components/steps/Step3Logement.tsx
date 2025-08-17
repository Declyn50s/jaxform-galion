// src/components/steps/Step3Logement.tsx
import React, { useEffect, useMemo } from "react";
import { UseFormReturn } from "react-hook-form";
import { FormData } from "@/types/form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface Step3LogementProps {
  form: UseFormReturn<FormData>;
  testMode?: boolean;
  /** ← comme l’étape 2 : on remonte “bloqué / pas bloqué” au parent */
  onValidityChange?: (blocked: boolean) => void;
  /** ← comme l’étape 2 : passe à true quand l’utilisateur clique “Suivant” */
  showBlocking?: boolean;
}

export const Step3Logement: React.FC<Step3LogementProps> = ({
  form,
  testMode = false,
  onValidityChange,
  showBlocking = false,
}) => {
  const piecesOptions = [
    "une chambre",
    "1 pièce",
    "1.5 pièces",
    "2.0 pièces",
    "2.5 pièces",
    "3.0 pièces",
    "3.5 pièces",
    "4.0 pièces",
    "4.5 pièces",
    "5.5 pièces",
    "+ pièces",
  ];

  const motifsOptions = [
    "Séparation / Divorce",
    "Bail résilié",
    "Logement trop cher",
    "Logement EVAM",
    "Sous-occupation",
    "Logement trop petit",
    "Raisons médicales",
    "Trajets trop longs",
    "Sans domicile / Hôtel",
    "Arrêt sous-location",
    "Accessibilité / Handicapé",
    "Arrêt co-location",
    "Logement de transition / Secondaire",
    "Indépendance / Nouveau ménage",
    "État du logement",
    "Logement démoli",
    "Autres",
  ];

  // watch valeurs
  const selectedPieces = String(form.watch("logement.pieces") ?? "");
  const selectedMotif = form.watch("logement.motif") ?? "";
  const loyerVal = form.watch("logement.loyerMensuelCHF") as number | "";

  // —— Validation locale
  const validation = useMemo(() => {
    const errors: string[] = [];
    const invalidPaths = new Set<string>();

    const piecesOk = !!selectedPieces;
    const motifOk = !!selectedMotif;

    const hasLoyer = loyerVal !== "" && loyerVal !== null && loyerVal !== undefined;
  const loyerNum =
    typeof loyerVal === "number"
      ? loyerVal
      : hasLoyer && Number.isFinite(Number(loyerVal))
      ? Number(loyerVal)
      : NaN;

  // accepté si rempli et >= 0 (donc 0 OK)
  const loyerOk = hasLoyer && Number.isFinite(loyerNum) && loyerNum >= 0;

    if (!piecesOk) {
      errors.push("Nombre de pièces requis.");
      invalidPaths.add("logement.pieces");
    }
    if (!loyerOk) {
      errors.push("Loyer mensuel requis (strictement positif).");
      invalidPaths.add("logement.loyerMensuelCHF");
    }
    if (!motifOk) {
      errors.push("Motif requis.");
      invalidPaths.add("logement.motif");
    }

    return { errors, invalidPaths, isValid: errors.length === 0 };
  }, [selectedPieces, selectedMotif, loyerVal]);

  useEffect(() => {
    onValidityChange?.(!validation.isValid);
  }, [validation.isValid, onValidityChange]);

  // helper pour border rouge après “Suivant”
  const invalid = (relPath: string) =>
    showBlocking && validation.invalidPaths.has(relPath);
  const dangerCls = "border-destructive focus-visible:ring-destructive";

  const commentaire = form.watch("logement.commentaire") ?? "";

  return (
    <div className="space-y-6">
      {/* Titre */}
      <div>
        <h2 className="text-2xl font-semibold">Votre logement actuel</h2>
        <p className="text-sm text-muted-foreground">
          Indiquez les informations concernant votre logement actuel.
        </p>
      </div>

      {/* Sélection pièces */}
      <div>
        <Label>Nombre de pièces</Label>
        <div className="flex gap-2 mt-1">
          <Select
            value={selectedPieces}
            onValueChange={(val) =>
              form.setValue("logement.pieces", val, {
                shouldValidate: !testMode,
                shouldDirty: true,
              })
            }
          >
            <SelectTrigger className={`w-full ${invalid("logement.pieces") ? dangerCls : ""}`}>
              <SelectValue placeholder="Sélectionner..." />
            </SelectTrigger>
            <SelectContent>
              {piecesOptions.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Loyer */}
      <div>
        <Label>Loyer mensuel (CHF)</Label>
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={loyerVal ?? ""}
          onChange={(e) =>
            form.setValue("logement.loyerMensuelCHF", e.target.valueAsNumber, {
              shouldValidate: !testMode,
              shouldDirty: true,
            })
          }
          onBlur={(e) => {
            const n = Math.max(0, Math.trunc(Number(e.target.value) || 0));
            form.setValue("logement.loyerMensuelCHF", n, {
              shouldValidate: !testMode,
              shouldDirty: true,
            });
          }}
          className={`mt-1 ${invalid("logement.loyerMensuelCHF") ? dangerCls : ""}`}
        />
      </div>

      {/* Motif (sélection unique) */}
      <div>
        <Label>Motif</Label>
        <div
          className={`mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 ${
            invalid("logement.motif") ? "ring-1 ring-destructive rounded-md p-1" : ""
          }`}
        >
          {motifsOptions.map((opt) => {
            const active = selectedMotif === opt;
            return (
              <Button
                key={opt}
                type="button"
                variant={active ? "default" : "outline"}
                className="justify-start"
                aria-pressed={active}
                onClick={() =>
                  form.setValue("logement.motif", opt, {
                    shouldValidate: !testMode,
                    shouldDirty: true,
                  })
                }
              >
                {opt}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Zone de texte libre (optionnel) */}
      <div>
        <Label>Précisions (optionnel)</Label>
        <Textarea
          className="mt-1 min-h-[110px]"
          placeholder="Ajoutez des précisions utiles (p. ex. état du logement, contraintes particulières, délais, etc.)"
          value={commentaire}
          onChange={(e) =>
            form.setValue("logement.commentaire", e.target.value, {
              shouldValidate: !testMode,
              shouldDirty: true,
            })
          }
        />
      </div>

      {/* Alerte récap si on a cliqué “Suivant” et que c’est invalide */}
      {showBlocking && validation.errors.length > 0 && (
        <Alert variant="destructive" role="alert" aria-live="polite">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-2">
              Corrigez ces éléments avant de continuer :
            </div>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {validation.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
