// src/components/steps/Step5JeunesEtudiant.tsx
import React, { useEffect, useMemo } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormData } from '@/types/form';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Helper pour calculer l’âge
const calcAge = (birthDate?: string): number | null => {
  if (!birthDate) return null;
  const dob = new Date(birthDate);
  const diff = Date.now() - dob.getTime();
  return new Date(diff).getUTCFullYear() - 1970;
};

// Communes COREL + Lausanne (liste fermée)
const COREL_COMMUNES = [
  'Lausanne',
  'Bussigny',
  'Chavannes-près-Renens',
  'Crissier',
  'Ecublens',
  'Prilly',
  'Renens',
  'St-Sulpice',
  'Villars-Sainte-Croix',
  'Bottens',
  'Bretigny-sur-Morrens',
  'Cheseaux-sur-Lausanne',
  'Cugy',
  'Froideville',
  'Jouxtens-Mézery',
  'Le Mont-sur-Lausanne',
  'Morrens',
  'Romanel-sur-Lausanne',
  'Belmont-sur-Lausanne',
  'Épalinges',
  'Lutry',
  'Jorat-Mézières',
  'Montpreveyres',
  'Paudex',
  'Pully',
  'Savigny',
  'Servion',
];

interface Step5JeunesEtudiantProps {
  form: UseFormReturn<FormData>;
  testMode?: boolean;
}

export function Step5JeunesEtudiant({ form, testMode }: Step5JeunesEtudiantProps) {
  const { watch, setValue } = form;

  const typeDemande = watch('typeDemande');
  const preneur = watch('members')?.find(m => m.role === 'locataire / preneur');
  const agePreneur = calcAge(preneur?.dateNaissance);

  // Champs du formulaire
  const statutEtudiant = watch('jeunesEtudiant.statutEtudiant');
  const bourseOuRevenuMin = watch('jeunesEtudiant.bourseOuRevenuMin');
  const toutPublic = watch('jeunesEtudiant.toutPublic');

  // NOUVEAUX CHAMPS
  const communeFormation = watch('jeunesEtudiant.communeFormation') as string | undefined;
  const motifImperieux = watch('jeunesEtudiant.motifImperieux') as string | undefined;

  // Dérive automatiquement "formationLausanne" en fonction de la commune choisie (compat rétro si le type existe)
  const formationDansCOREL = useMemo(
    () => !!communeFormation && COREL_COMMUNES.includes(communeFormation),
    [communeFormation]
  );

  // Écrit le flag legacy si présent dans le schéma
  useEffect(() => {
    try {
      setValue('jeunesEtudiant.formationLausanne', formationDansCOREL as any);
    } catch {
      // pas grave si le champ n'existe pas dans FormData
    }
  }, [formationDansCOREL, setValue]);

  // Si on coche "tout public", on désactive l'éligibilité jeunes et on exige un motif
  useEffect(() => {
    if (toutPublic) {
      try {
        setValue('jeunesEtudiant.statutEtudiant', false);
        setValue('jeunesEtudiant.bourseOuRevenuMin', false);
        setValue('jeunesEtudiant.formationLausanne', false);
      } catch {
        /* noop */
      }
    }
  }, [toutPublic, setValue]);

  // Si on ne doit pas afficher, on ne rend rien
  if (typeDemande !== 'Conditions étudiantes') return null;
  if (agePreneur !== null && agePreneur >= 25) return null;

  // Règle d’éligibilité (claire et stricte)
  const isEligibleJeunes =
    !toutPublic &&
    typeDemande === 'Conditions étudiantes' &&
    agePreneur !== null &&
    agePreneur < 25 &&
    statutEtudiant &&
    bourseOuRevenuMin &&
    formationDansCOREL;

  const communeManquanteOuHorsZone = !communeFormation || !formationDansCOREL;

  return (
    <Card>
      <CardContent className="space-y-6">
        <h2 className="text-xl font-bold">Étape 5 — Jeunes / Étudiant</h2>
        <p className="text-sm text-muted-foreground">
          Conditions spéciales pour les jeunes entre 18 et 25 ans en formation (1,5 pièce maximum).
        </p>

        <div className="space-y-4">
          {/* Statut étudiant */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="statutEtudiant"
              checked={!!statutEtudiant}
              onCheckedChange={(val) => setValue('jeunesEtudiant.statutEtudiant', !!val)}
              disabled={!!toutPublic}
            />
            <Label htmlFor="statutEtudiant">Je suis en première formation</Label>
          </div>

          {/* Commune de formation (OBLIGATOIRE) */}
          <div className="space-y-2">
            <Label htmlFor="communeFormation">Commune de formation</Label>
            <Select
              value={communeFormation ?? ''}
              onValueChange={(v) => setValue('jeunesEtudiant.communeFormation', v)}
            >
              <SelectTrigger id="communeFormation">
                <SelectValue placeholder="Sélectionner une commune (Lausanne / COREL)" />
              </SelectTrigger>
              <SelectContent>
                {COREL_COMMUNES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Rappel : le lieu de la formation doit être **à Lausanne** ou **dans Lausanne Région (COREL)**.
            </p>
            {communeManquanteOuHorsZone && (
              <p className="text-xs text-red-600">
                Sélection obligatoire. Hors zone = **non éligible** aux conditions étudiantes.
              </p>
            )}
          </div>

          {/* Bourse ou revenu min */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="bourseOuRevenuMin"
              checked={!!bourseOuRevenuMin}
              onCheckedChange={(val) => setValue('jeunesEtudiant.bourseOuRevenuMin', !!val)}
              disabled={!!toutPublic}
            />
            <Label htmlFor="bourseOuRevenuMin">
              Je bénéficie d&apos;une bourse ou j&apos;ai un revenu accessoire ≥ CHF 6’000/an
            </Label>
          </div>

          {/* Mode tout public */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="toutPublic"
              checked={!!toutPublic}
              onCheckedChange={(val) => setValue('jeunesEtudiant.toutPublic', !!val)}
            />
            <Label htmlFor="toutPublic">
              Mode tout public (désactive l&apos;éligibilité jeunes)
            </Label>
          </div>

          {/* Motif impérieux si tout public */}
          {toutPublic && (
            <div className="space-y-2">
              <Label htmlFor="motifImperieux">Motif impérieux (à joindre)</Label>
              <Textarea
                id="motifImperieux"
                placeholder="Expliquez le motif impérieux et mentionnez le justificatif joint."
                value={motifImperieux ?? ''}
                onChange={(e) => setValue('jeunesEtudiant.motifImperieux', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Joignez le document justificatif correspondant à ce motif. Sans motif, la demande tout public est fragilisée.
              </p>
            </div>
          )}
        </div>

        {/* Affichage du statut */}
        {isEligibleJeunes ? (
          <Badge className="bg-green-100 text-green-800 border-green-300">Éligible jeunes</Badge>
        ) : (
          <Badge variant="destructive">Non éligible jeunes</Badge>
        )}

        {/* Mode test */}
        {testMode && (
          <div className="text-xs text-muted-foreground mt-4 space-y-1">
            <p>Âge preneur: {agePreneur ?? 'N/A'}</p>
            <p>Commune de formation: {communeFormation ?? 'N/A'}</p>
            <p>Dans COREL/Lausanne: {formationDansCOREL ? 'Oui' : 'Non'}</p>
            <p>Éligible jeunes: {isEligibleJeunes ? 'Oui' : 'Non'}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
