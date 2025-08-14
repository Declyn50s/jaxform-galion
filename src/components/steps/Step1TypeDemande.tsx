import React from 'react';
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
  const { watch, setValue, formState: { errors } } = form;

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

  const handleTypeChange = (value: string) => {
    setValue('typeDemande', value as any, { shouldValidate: true });

    // Reset du pré-filtrage si on quitte Inscription
    if (value !== 'Inscription') {
      setValue('preFiltering', undefined, { shouldValidate: false, shouldDirty: true });
    }
    onTypeChange?.(value);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Type de demande
            {testMode && (
              <Badge variant="outline" className="ml-auto">Mode Test</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3" role="radiogroup" aria-labelledby="type-demande-label">
            <Label id="type-demande-label" className="text-base font-medium">
              Sélectionnez le type de votre demande :
            </Label>

            {demandTypes.map((type) => (
              <div key={type.value}>
                <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors hover:bg-accent/50 focus-within:ring-2 focus-within:ring-ring">
                  <input
                    type="radio"
                    name="typeDemande"
                    value={type.value}
                    checked={typeDemande === type.value}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    className="mt-1 h-4 w-4 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    aria-describedby={`${type.value}-description`}
                  />
                  <div className="flex-1">
                    <div className="font-medium">{type.label}</div>
                    <div id={`${type.value}-description`} className="text-sm text-muted-foreground mt-1">
                      {type.description}
                    </div>
                  </div>
                </label>
              </div>
            ))}
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
                  <li>• Bourse ou activité accessoire de <strong>+6'000 CHF/an</strong></li>
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
