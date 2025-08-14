// src/components/steps/Step3Logement.tsx
import React from "react";
import { UseFormReturn } from "react-hook-form";
import { FormData } from "@/types/form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea"; // si tu ne l’as pas, vois la note plus bas
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Step3LogementProps {
  form: UseFormReturn<FormData>;
  testMode?: boolean;
}

export const Step3Logement: React.FC<Step3LogementProps> = ({
  form,
  testMode = false,
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

  const selectedPieces = String(form.watch("logement.pieces") ?? "");
  const selectedMotif = form.watch("logement.motif") ?? "";
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

      {/* Sélection pièces + bouton Chambre */}
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
            <SelectTrigger className="w-full">
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
          value={form.watch("logement.loyerMensuelCHF") ?? ""}
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
          className="mt-1"
        />
      </div>

      {/* Motif en boutons (sélection unique) */}
      <div>
        <Label>Motif</Label>
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
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

      {/* Zone de texte libre */}
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
    </div>
  );
};
