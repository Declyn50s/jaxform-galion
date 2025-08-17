// src/components/steps/Step5JeunesEtudiant.tsx
import React, { useEffect, useMemo } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormData } from '@/types/form';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { FileUpload } from '@/components/FileUpload';

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
] as const;

interface Step5JeunesEtudiantProps {
  form: UseFormReturn<FormData>;
  testMode?: boolean;
}

export function Step5JeunesEtudiant({ form, testMode }: Step5JeunesEtudiantProps) {
  const { watch, setValue } = form;

  const typeDemande = watch('typeDemande');
  const preneur = watch('members')?.find(m => m.role === 'locataire / preneur');
  const agePreneur = calcAge(preneur?.dateNaissance);
  const motifImperieuxFile = watch('jeunesEtudiant.motifImperieuxFile') as File | undefined;


  // Champs du formulaire
  const bourseOuRevenuMin = watch('jeunesEtudiant.bourseOuRevenuMin');
  const toutPublic = watch('jeunesEtudiant.toutPublic');


  // Champ libre (lieu)
  const communeFormation = watch('jeunesEtudiant.communeFormation') as string | undefined;
  const motifImperieux = watch('jeunesEtudiant.motifImperieux') as string | undefined;

  // Normalisation (pour comparer aux COREL)
  const norm = (s: string) =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  // formationDansCOREL basé sur le champ libre
  const formationDansCOREL = useMemo(() => {
    if (!communeFormation) return false;
    return COREL_COMMUNES.map(norm).includes(norm(communeFormation));
  }, [communeFormation]);

  // Met à jour le flag legacy et hors-zone
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

  // Si mode tout public, on force certaines valeurs
  useEffect(() => {
    if (toutPublic) {
      try {
        // L'ancien champ statutEtudiant a été retiré
        setValue('jeunesEtudiant.formationLausanne', false);
      } catch {}
    }
  }, [toutPublic, setValue]);

  if (typeDemande !== 'Conditions étudiantes') return null;
  if (agePreneur !== null && agePreneur >= 25) return null;

  // Eligibilité (le critère "statut étudiant" a été retiré)
  const isEligibleJeunes =
    !toutPublic &&
    typeDemande === 'Conditions étudiantes' &&
    agePreneur !== null &&
    agePreneur < 25 &&
    bourseOuRevenuMin &&
    formationDansCOREL;

  const communeVide = !communeFormation || !communeFormation.trim();
  const requiresMotifFile = !!toutPublic; // on exige la pièce jointe en mode tout public

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
            <div className="flex items-center gap-2 rounded-xl border px-3 py-2 focus-within:ring-2 bg-white
              border-input focus-within:ring-blue-500">
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
            {!!communeFormation && !formationDansCOREL && (
              <p className="text-xs text-amber-700">
                Lieu hors COREL : non éligible aux conditions étudiantes.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Si apprentissage, seul le <strong>lieu de l’apprentissage</strong> fait foi.
            </p>
          </div>

          {/* Remplacement: pièce jointe du motif impérieux */}
<div className="space-y-1">
  <div className="text-sm font-medium">Motif impérieux — pièce jointe</div>
  <FileUpload
    value={motifImperieuxFile}
    onChange={(file) => setValue('jeunesEtudiant.motifImperieuxFile', file as File | null)}
    accept={["application/pdf", "image/jpeg", "image/png"]}
    multiple={false}
    disabled={false}
  />

  <p className="text-xs text-amber-700">
    Le document doit être <strong>émis par un tiers</strong> (école, employeur, autorité),
    <strong> pas par le demandeur</strong>.
  </p>
  {requiresMotifFile && !motifImperieuxFile && (
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
                Joignez le document justificatif correspondant à ce motif ci-dessus. Sans motif, la demande tout public est fragilisée.
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