// src/components/WizardDemande.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Step1TypeDemande } from './steps/Step1TypeDemande';
import { PreFiltering } from './steps/PreFiltering'; // <- export nommé
import type { FormData } from '@/types/form';        // <- unifie le type partagé

type PhaseStep1 = 'type' | 'prefilter';

export default function WizardDemande() {
  const testMode = false; // passe à true pour bypass la validation PreFiltering

  const form = useForm<FormData>({
    mode: 'onChange',
    defaultValues: {
      typeDemande: undefined,
      preFiltering: undefined, // sera un objet quand on entre dans la sous-phase
      members: []
    }
  });

  const [step, setStep] = useState<number>(1);             // étapes "réelles"
  const [phase, setPhase] = useState<PhaseStep1>('type');  // sous-phase de l’étape 1
  const [showPrefilterErrors, setShowPrefilterErrors] = useState(false);

  const typeDemande = form.watch('typeDemande');
  const preFiltering = form.watch('preFiltering');

  // Ne JAMAIS compter PreFiltering comme une étape
  const progressStep = step;

  // Si on quitte "Inscription" → on sort de la sous-phase et on purge le pré-filtrage
  useEffect(() => {
    if (typeDemande !== 'Inscription') {
      if (phase === 'prefilter') setPhase('type');
      if (preFiltering && Object.keys(preFiltering || {}).length) {
        form.setValue('preFiltering', undefined, { shouldValidate: false, shouldDirty: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeDemande]);

  // Validation pré-filtrage: OK si habite 3 ans OU travaille 3 ans (ou testMode)
  const isPreFilteringValid = useMemo(() => {
    if (testMode) return true;
    if (!preFiltering) return false;
    const { habiteLausanne3Ans, travailleLausanne3Ans } = preFiltering as any;
    return habiteLausanne3Ans === true || travailleLausanne3Ans === true;
  }, [preFiltering, testMode]);

  const goNext = () => {
    if (step === 1) {
      if (phase === 'type') {
        if (typeDemande === 'Inscription') {
          // On initialise l’objet preFiltering si nécessaire et on reste à l’étape 1
          if (!preFiltering) {
            form.setValue('preFiltering', {}, { shouldValidate: false, shouldDirty: true });
          }
          setPhase('prefilter');
          setShowPrefilterErrors(false);
        } else {
          // Pas "Inscription" → étape 2 directe
          setStep(2);
        }
        return;
      }
      // phase === 'prefilter'
      if (isPreFilteringValid) {
        setStep(2);               // autorisé seulement si valide (ou testMode)
        setPhase('type');         // reset phase pour d’éventuels retours
        setShowPrefilterErrors(false);
      } else {
        setShowPrefilterErrors(true);
      }
      return;
    }

    // Étapes suivantes (si tu en as)
    setStep((s) => s + 1);
  };

  const goBack = () => {
    // Depuis la sous-phase PreFiltering → retour à Step1TypeDemande, même étape
    if (step === 1 && phase === 'prefilter') {
      setPhase('type');
      setShowPrefilterErrors(false);
      return;
    }
    // Depuis l’étape 2 → si on venait d'Inscription, retour à la sous-phase
    if (step === 2) {
      if (typeDemande === 'Inscription') {
        setStep(1);
        setPhase('prefilter');
      } else {
        setStep(1);
        setPhase('type');
      }
      return;
    }

    // Par défaut, recule d’une étape
    setStep((s) => Math.max(1, s - 1));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* <FormProgress currentStep={progressStep} totalSteps={5} /> */}

      {step === 1 && phase === 'type' && (
        <Step1TypeDemande
          form={form}
          testMode={testMode}
          onTypeChange={(v) => { if (v !== 'Inscription') setPhase('type'); }}
        />
      )}

      {step === 1 && phase === 'prefilter' && (
        <PreFiltering form={form} testMode={testMode} showErrors={showPrefilterErrors} />
      )}

      {step === 2 && (
        <div className="border rounded-lg p-6 text-sm text-muted-foreground">
          Étape 2 — remplace par ton contenu réel.
        </div>
      )}

      <div className="flex justify-between">
        <button
          className="btn btn-secondary"
          onClick={goBack}
          disabled={step === 1 && phase === 'type'}
        >
          Précédent
        </button>
        <button
          className="btn btn-primary"
          onClick={goNext}
          // Optionnel: empêcher "Suivant" si aucun type sélectionné dans la phase type
          disabled={step === 1 && phase === 'type' && !typeDemande}
        >
          Suivant
        </button>
      </div>
    </div>
  );
}
