// src/components/steps/Step5JeunesEtudiant.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormData } from '@/types/form';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { FileUpload } from '@/components/FileUpload';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { COREL_COMMUNES } from '@/types/form';

// Helper pour calculer l’âge
const calcAge = (birthDate?: string): number | null => {
  if (!birthDate) return null;
  const dob = new Date(birthDate);
  const diff = Date.now() - dob.getTime();
  return new Date(diff).getUTCFullYear() - 1970;
};

interface Step5JeunesEtudiantProps {
  form: UseFormReturn<FormData>;
  testMode?: boolean;
  onValidityChange?: (blocked: boolean) => void;
  showBlocking?: boolean;
}

export function Step5JeunesEtudiant({
  form,
  testMode,
  onValidityChange,
  showBlocking = false,
}: Step5JeunesEtudiantProps) {
  const { watch, setValue } = form;

  const typeDemande = watch('typeDemande');
  const preneur = watch('members')?.find((m) => m.role === 'locataire / preneur');
  const agePreneur = calcAge(preneur?.dateNaissance);
  const motifImperieuxFile = watch('jeunesEtudiant.motifImperieuxFile') as File | undefined;

  // Champs du formulaire
  const bourseOuRevenuMin = watch('jeunesEtudiant.bourseOuRevenuMin');
  const toutPublic = watch('jeunesEtudiant.toutPublic');

  // Champ libre (lieu) + motif (texte)
  const communeFormation = watch('jeunesEtudiant.communeFormation') as string | undefined;
  const motifImperieux = watch('jeunesEtudiant.motifImperieux') as string | undefined;

  // Normalisation (pour comparer aux COREL)
  const norm = (s: string) =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  const formationDansCOREL = useMemo(() => {
    if (!communeFormation) return false;
    return COREL_COMMUNES.map(norm).includes(norm(communeFormation));
  }, [communeFormation]);

  // Met à jour des flags dérivés
  useEffect(() => {
    try {
      setValue('jeunesEtudiant.formationLausanne', formationDansCOREL as any);
    } catch {}
    try {
      setValue(
        'jeunesEtudiant.communeHorsZoneNom',
        communeFormation && !formationDansCOREL ? communeFormation : ''
      );
    } catch {}
  }, [formationDansCOREL, communeFormation, setValue]);

  // Tout public force formationLausanne à false
  useEffect(() => {
    if (toutPublic) {
      try {
        setValue('jeunesEtudiant.formationLausanne', false);
      } catch {}
    }
  }, [toutPublic, setValue]);

  if (typeDemande !== 'Conditions étudiantes') return null;
  if (agePreneur !== null && (agePreneur < 18 || agePreneur >= 25)) return null;

  // Eligibilité (indicative)
  const isEligibleJeunes =
  !toutPublic &&
  typeDemande === 'Conditions étudiantes' &&
  agePreneur !== null &&
  agePreneur >= 18 &&
  agePreneur < 25 &&
  bourseOuRevenuMin &&
  formationDansCOREL;

  // ---------- VALIDATION BLOQUANTE ----------
  const communeVide = !communeFormation || !communeFormation.trim();

  const errors = useMemo(() => {
    const list: string[] = [];

    // Champ lieu : toujours obligatoire
    if (communeVide) {
      list.push('Le champ « Lieu de formation » est obligatoire.');
    }

    if (!toutPublic) {
      // Mode JEUNES : lieu doit être COREL + case bourse/revenu cochée
      if (!communeVide && !formationDansCOREL) {
        list.push('Le lieu de formation doit être dans la liste COREL/Lausanne.');
      }
      if (!bourseOuRevenuMin) {
        list.push('Cochez « bourse et/ou revenu accessoire ≥ CHF 6’000/an ».');
      }
    } else {
      // Mode TOUT PUBLIC : motif texte + pièce jointe obligatoires
      if (!motifImperieux || !motifImperieux.trim()) {
        list.push('Renseignez le motif impérieux (description).');
      }
      if (!motifImperieuxFile) {
        list.push('Joignez le document du motif impérieux.');
      }
    }

    return list;
  }, [
    communeVide,
    formationDansCOREL,
    bourseOuRevenuMin,
    toutPublic,
    motifImperieux,
    motifImperieuxFile,
  ]);

  const isValid = errors.length === 0;

  // Remontée de l’état au parent (App.tsx)
  useEffect(() => {
    onValidityChange?.(testMode ? false : !isValid);
  }, [isValid, onValidityChange, testMode]);

  // Contrôle d’affichage de l’alerte par le parent
  const [showErrors, setShowErrors] = useState(false);
  useEffect(() => {
    if (showBlocking && !isValid) setShowErrors(true);
    if (!showBlocking) setShowErrors(false);
  }, [showBlocking, isValid]);

  return (
    <Card>
      <CardContent className="space-y-6">
        <h2 className="text-xl font-bold">Jeunes en formation de moins de 25 ans</h2>
        <p className="text-sm text-muted-foreground">
          Conditions spéciales pour les jeunes entre 18 et 25 ans en formation (1,5 pièce maximum).
        </p>

        <div className="space-y-4">
          {/* Bourse ou revenu min */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="bourseOuRevenuMin"
              checked={!!bourseOuRevenuMin}
              onCheckedChange={(val) => setValue('jeunesEtudiant.bourseOuRevenuMin', !!val)}
              disabled={!!toutPublic}
            />
            <Label htmlFor="bourseOuRevenuMin">
              Je bénéficie d&apos;une bourse et/ou j&apos;ai un revenu accessoire ≥ CHF 6’000/an
            </Label>
          </div>

          {/* Lieu de formation — champ texte libre */}
          <div className="space-y-1">
            <Label htmlFor="communeFormation">Lieu de la formation</Label>
            <div
              className="flex items-center gap-2 rounded-xl border px-3 py-2 focus-within:ring-2 bg-white
              border-input focus-within:ring-blue-500"
            >
              <span aria-hidden>📍</span>
              <Input
                id="communeFormation"
                placeholder="Ex. Lausanne, Crissier…"
                value={communeFormation ?? ''}
                onChange={(e) => setValue('jeunesEtudiant.communeFormation', e.target.value)}
                className="border-0 focus-visible:ring-0 focus:outline-none p-0"
              />
            </div>

            {communeVide && (
              <p className="text-xs text-red-600">
                Le champ « Lieu de formation » est obligatoire.
              </p>
            )}
            {!!communeFormation && !formationDansCOREL && !toutPublic && (
              <p className="text-xs text-amber-700">
                Lieu hors COREL : non éligible aux conditions étudiantes.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Si apprentissage, seul le <strong>lieu de l’apprentissage</strong> fait foi.
            </p>
          </div>

          {/* Motif impérieux — pièce jointe */}
          <div className="space-y-1">
            <div className="text-sm font-medium">Motif impérieux — pièce jointe</div>
            <FileUpload
  value={motifImperieuxFile ?? null}
  onChange={(file) => setValue('jeunesEtudiant.motifImperieuxFile', file as File | null)}
  accept="application/pdf,image/jpeg,image/png"
  multiple={false}
/>

            <p className="text-xs text-amber-700">
              Le document doit être <strong>émis par un tiers</strong> (école, employeur, autorité),
              <strong> pas par le demandeur</strong>.
            </p>
            {toutPublic && !motifImperieuxFile && (
              <p className="text-xs text-red-600">
                En mode tout public, la pièce jointe du motif impérieux est obligatoire.
              </p>
            )}
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

          {/* Motif impérieux (texte) si tout public */}
          {toutPublic && (
            <div className="space-y-2">
              <Label htmlFor="motifImperieux">Motif impérieux (description)</Label>
              <Textarea
                id="motifImperieux"
                placeholder="Expliquez brièvement le motif impérieux et mentionnez le justificatif joint."
                value={motifImperieux ?? ''}
                onChange={(e) => setValue('jeunesEtudiant.motifImperieux', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Joignez le document justificatif correspondant à ce motif ci-dessus.
              </p>
            </div>
          )}
        </div>

        {/* Badge éligibilité */}
        {isEligibleJeunes ? (
          <Badge className="bg-green-100 text-green-800 border-green-300">Éligible jeunes</Badge>
        ) : (
          <Badge variant="destructive">Non éligible jeunes</Badge>
        )}

        {/* Alerte erreurs agrégées (déclenchée par le parent) */}
        {showErrors && errors.length > 0 && (
          <div
            className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-4"
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5" aria-hidden />
              <div>
                <p className="font-medium">Complétez les éléments suivants :</p>
                <ul className="list-disc pl-5 space-y-1 mt-2 text-sm">
                  {errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Indication prêt */}
        {isValid && (
          <div className="inline-flex items-center gap-1 text-sm text-green-700 mt-2">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            Tout est prêt pour continuer
          </div>
        )}

        {/* Mode test */}
        {testMode && (
          <div className="text-xs text-muted-foreground mt-4 space-y-1">
            <p>Âge preneur: {agePreneur ?? 'N/A'}</p>
            <p>Commune de formation: {communeFormation ?? 'N/A'}</p>
            <p>Dans COREL/Lausanne: {formationDansCOREL ? 'Oui' : 'Non'}</p>
            <p>Éligible jeunes: {isEligibleJeunes ? 'Oui' : 'Non'}</p>
            <p>Motif impérieux fichier: {motifImperieuxFile ? 'Oui' : 'Non'}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default Step5JeunesEtudiant;
