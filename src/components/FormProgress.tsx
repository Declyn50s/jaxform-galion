import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface FormProgressProps {
  currentStep: number;
  /** Optionnel : sera ignoré si absent, on utilise la longueur des étapes dynamiques */
  totalSteps?: number;
  testMode: boolean;
  /** true = parcours étudiants (7 étapes), false = tout public (6 étapes) */
  isStudentFlow?: boolean;
}

const defaultSteps = [
  'Type de demande',
  'Ménage',
  'Logement',
  'Finances',
  // (pas d’étape “Jeunes/Étudiants” ici)
  'Consentements',
  'Récapitulatif',
];

const studentSteps = [
  'Type de demande',
  'Ménage',
  'Logement',
  'Finances',
  'Jeunes/Étudiants',
  'Consentements',
  'Récapitulatif',
];

export function FormProgress({
  currentStep,
  totalSteps,
  testMode,
  isStudentFlow = false,
}: FormProgressProps) {
  const stepList = isStudentFlow ? studentSteps : defaultSteps;

  // total “source de vérité” = props.totalSteps si fourni, sinon longueur calculée
  const computedTotal = totalSteps ?? stepList.length;

  // clamp pour éviter les débordements si currentStep > computedTotal
  const safeCurrent = Math.min(Math.max(currentStep, 1), computedTotal);

  const progress = (safeCurrent / computedTotal) * 100;

  return (
    <div className="w-full mb-8">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-semibold">
            Étape {safeCurrent} sur {computedTotal}
          </h2>
          <p className="text-sm text-muted-foreground">
            {stepList[safeCurrent - 1] || 'Finalisation'}
          </p>
        </div>
         
      </div>

      <Progress
        value={progress}
        className="w-full"
        aria-label={`Progression du formulaire: ${Math.round(progress)}%`}
      />

      <div className="flex justify-between text-xs text-muted-foreground mt-2">
        <span>Début</span>
        <span>{Math.round(progress)}% complété</span>
        <span>Fin</span>
      </div>
    </div>
  );
}
