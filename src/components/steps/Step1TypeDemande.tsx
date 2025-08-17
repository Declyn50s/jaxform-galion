import React, { useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';
import { FormData } from '@/types/form';
import { calcAge } from '@/lib/helpers';

interface Step1Props {
  form: UseFormReturn<FormData>;
  testMode: boolean;
  onTypeChange?: (value: string) => void;
}

export function Step1TypeDemande({ form, testMode, onTypeChange }: Step1Props) {
  const { watch, setValue, getValues, formState: { errors } } = form;

  const typeDemande = watch('typeDemande');
  const members = watch('members') || [];
  const preneur = members.find(m => m.role === 'locataire / preneur');

  const preneurAge = preneur && preneur.dateNaissance ? calcAge(preneur.dateNaissance) : null;
  const showAgeWarning = typeDemande === 'Conditions étudiantes' && preneurAge !== null && preneurAge >= 25;

  const demandTypes = [
    { value: 'Inscription', label: 'Inscription', description: 'Première demande de logement LLM' },
    { value: 'Renouvellement', label: 'Renouvellement', description: 'Renouvellement de votre inscription' },
    { value: 'Mise à jour', label: 'Mise à jour', description: 'Modification de vos informations' },
    { value: 'Contrôle', label: 'Contrôle', description: 'Vérification périodique des conditions' },
    { value: 'Conditions étudiantes', label: 'Conditions étudiantes', description: 'Parcours spécial jeunes en formation' }
  ];

  // Sécurité: si le navigateur réinjecte une ancienne valeur, on l'efface
  useEffect(() => {
    const v = getValues('typeDemande');
    if (v === '' || v === null) {
      setValue('typeDemande', undefined as any, { shouldValidate: false, shouldDirty: false });
    }
    // NE PAS définir de valeur par défaut ici: on laisse vide.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTypeChange = (value: string) => {
    setValue('typeDemande', value as any, { shouldValidate: true });
    if (value !== 'Inscription') {
      setValue('preFiltering', undefined, { shouldValidate: false, shouldDirty: true });
    }
    onTypeChange?.(value);
  };

  const clearSelection = () => {
    setValue('typeDemande', undefined as any, { shouldValidate: true, shouldDirty: true });
  };

  return (
    <div className="space-y-6" autoComplete="off">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Type de demande
            {testMode && <Badge variant="outline" className="ml-auto">Mode Test</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3" role="radiogroup" aria-labelledby="type-demande-label">
            <Label id="type-demande-label" className="text-base font-medium">
              Sélectionnez le type de votre demande :
            </Label>

            {demandTypes.map((type) => {
  const isSelected = typeDemande === type.value;

  return (
    <div key={type.value}>
      <label
        className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors
          focus-within:ring-2 focus-within:ring-ring
          ${isSelected 
            ? "bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/80 hover:text-black" 
            : "hover:bg-[hsl(var(--primary))]/80 hover:text-black"
          }`}
      >
        <input
          type="radio"
          name="typeDemande"
          value={type.value}
          checked={isSelected}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="mt-1 h-4 w-4 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
          aria-describedby={`${type.value}-description`}
        />
        <div className="flex-1">
          <div className="font-medium">{type.label}</div>
          <div
            id={`${type.value}-description`}
            className="text-sm mt-1"
          >
            {type.description}
          </div>
        </div>
      </label>
    </div>
  );
})}

          </div>

          {errors.typeDemande && (
            <Alert variant="destructive" role="alert" aria-live="polite">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.typeDemande.message}</AlertDescription>
            </Alert>
          )}

          {showAgeWarning && (
            <Alert variant="destructive" role="alert" aria-live="polite">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Attention :</strong> Les conditions étudiantes sont réservées aux personnes de moins de 25 ans.
                Le preneur principal a {preneurAge} ans. Veuillez sélectionner un autre type de demande
                ou modifiez les informations du ménage.
                {!testMode && (
                  <div className="mt-2">
                    <span className="text-sm">Redirection vers les conditions "tout public" recommandée.</span>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {typeDemande === 'Conditions étudiantes' && !showAgeWarning && (
            <Alert role="region" aria-labelledby="student-info">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div id="student-info" className="font-medium mb-2">Parcours "jeunes en formation"</div>
                <ul className="text-sm space-y-1">
                  <li>• Réservé aux personnes de <strong>moins de 25 ans</strong></li>
                  <li>• Nationalité suisse ou permis C/B/F valable</li>
                  <li>• Première formation à Lausanne Région</li>
                  <li>• Bourse ou/et activité accessoire de <strong>+6'000 CHF/an</strong></li>
                  <li>• Avoir un motif impérieux</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
