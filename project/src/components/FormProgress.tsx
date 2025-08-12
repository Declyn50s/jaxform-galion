import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface FormProgressProps {
  currentStep: number;
  totalSteps: number;
  testMode: boolean;
}

const steps = [
  'Type de demande',
  'Ménage', 
  'Logement',
  'Finances',
  'Jeunes/Étudiants',
  'Consentements',
  'Récapitulatif'
];

export function FormProgress({ currentStep, totalSteps, testMode }: FormProgressProps) {
  const progress = (currentStep / totalSteps) * 100;
  
  return (
    <div className="w-full mb-8">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-semibold">
            Étape {currentStep} sur {totalSteps}
          </h2>
          <p className="text-sm text-muted-foreground">
            {steps[currentStep - 1] || 'Finalisation'}
          </p>
        </div>
        
        {testMode && (
          <Badge variant="outline" className="bg-yellow-50 border-yellow-200">
            Mode Test
          </Badge>
        )}
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