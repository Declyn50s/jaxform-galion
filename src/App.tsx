import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { FormData, formSchema } from '@/types/form';
import { useAutoSave } from '@/hooks/useAutoSave';
import { FormProgress } from '@/components/FormProgress';
import { Step1TypeDemande } from '@/components/steps/Step1TypeDemande';
import { PreFiltering } from '@/components/steps/PreFiltering';
import { Step2Menage } from '@/components/steps/Step2Menage';
import { Step3Logement } from '@/components/steps/Step3Logement';
import { Step4Finances } from '@/components/steps/Step4Finances';
import { Step5JeunesEtudiant } from '@/components/steps/Step5JeunesEtudiant';
import Step6Consentements from './components/steps/Step6Consentements';
import Step7Recap from './components/steps/Step7Recap';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RotateCcw, ArrowLeft, ArrowRight } from 'lucide-react';
import { calcAge } from '@/lib/helpers';

type PhaseStep1 = 'type' | 'prefilter';

const defaultFormData: FormData = {
  typeDemande: undefined as any,
  members: [],
  logement: { pieces: 2, loyerMensuelCHF: 0, motif: '' },
  finances: [],
  consentements: { traitementDonnees: false, conditionsGenerales: false },
  jeunesEtudiant: {
    statutEtudiant: false,
    formationLausanne: false,
    bourseOuRevenuMin: false,
    toutPublic: false,
    motif: ''
  },
  testMode: false,
  currentStep: 1
};

function App() {
  const [testMode, setTestMode] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [phase, setPhase] = useState<PhaseStep1>('type');
  const [showPrefilterErrors, setShowPrefilterErrors] = useState(false);

  // États de blocage/erreurs par étape
  const [step2Blocked, setStep2Blocked] = useState(true);
  const [step2ShowErrors, setStep2ShowErrors] = useState(false);
  const [step3Blocked, setStep3Blocked] = useState(true);
  const [step3ShowErrors, setStep3ShowErrors] = useState(false);
  const [step4Blocked, setStep4Blocked] = useState(true);
  const [step4ShowErrors, setStep4ShowErrors] = useState(false);
  const [step5Blocked, setStep5Blocked] = useState(true);
  const [step5ShowErrors, setStep5ShowErrors] = useState(false);
  const [step6Blocked, setStep6Blocked] = useState(true);
  const [step6ShowErrors, setStep6ShowErrors] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultFormData,
    mode: 'onChange'
  });

  const { clearSavedData } = useAutoSave(form.watch(), userEmail);

  // Watch
  const typeDemande = form.watch('typeDemande');
  const preFiltering = form.watch('preFiltering');
  const members = form.watch('members') || [];

  // Préfiltrage
  const habite = form.watch('preFiltering.habiteLausanne3Ans');
  const travaille = form.watch('preFiltering.travailleLausanne3Ans');
  const isPreFilteringValid = testMode || (habite === true || travaille === true);

  // Flow étudiant = type "Conditions étudiantes" ET âge preneur < 25 (ou inconnu)
  const preneur = members.find((m: any) => m?.role === 'locataire / preneur');
  const preneurAge = preneur?.dateNaissance ? calcAge(preneur.dateNaissance) : null;
  const isStudentType = typeDemande === 'Conditions étudiantes';
 const ageOk = preneurAge == null || (preneurAge >= 18 && preneurAge < 25);
  const isStudentFlow = isStudentType && ageOk;

  // Nombre d'étapes
  const totalSteps = isStudentFlow ? 7 : 6;

  // Étape consentements (varie selon le flow)
  const isConsentStep = (!isStudentFlow && currentStep === 5) || (isStudentFlow && currentStep === 6);

  // Y a-t-il d'autres adultes ?
  const hasOtherAdults =
    (members || []).filter((m: any) => m?.dateNaissance && calcAge(m.dateNaissance) >= 18).length > 1;

  // Sortie de sous-phase si on quitte "Inscription"
  useEffect(() => {
    if (typeDemande !== 'Inscription') {
      if (phase === 'prefilter') setPhase('type');
      if (preFiltering && Object.keys(preFiltering || {}).length) {
        form.setValue('preFiltering', undefined, { shouldValidate: false, shouldDirty: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeDemande]);

  // Navigation
  const nextStep = (cur: number) => Math.min(cur + 1, isStudentFlow ? 7 : 6);
  const prevStep = (cur: number) => Math.max(cur - 1, 1);

  // Clamp si le flow change
  useEffect(() => {
    const cap = isStudentFlow ? 7 : 6;
    if (currentStep > cap) {
      setCurrentStep(cap);
      form.setValue('currentStep', cap);
    }
  }, [isStudentFlow, currentStep, form]);

  // Reset affichage d'erreurs en entrant sur les étapes
  useEffect(() => { if (currentStep === 2) setStep2ShowErrors(false); }, [currentStep]);
  useEffect(() => { if (currentStep === 3) setStep3ShowErrors(false); }, [currentStep]);
  useEffect(() => { if (currentStep === 4) setStep4ShowErrors(false); }, [currentStep]);
  useEffect(() => { if (currentStep === 5 && isStudentFlow) setStep5ShowErrors(false); }, [currentStep, isStudentFlow]);
  useEffect(() => { if (isConsentStep) setStep6ShowErrors(false); }, [isConsentStep, currentStep]);

  // Next
  const handleNext = () => {
    if (currentStep === 1) {
      if (phase === 'type') {
        if (typeDemande === 'Inscription') {
          if (!preFiltering) {
            form.setValue('preFiltering', {
              habiteLausanne3Ans: undefined,
              travailleLausanne3Ans: undefined,
              flagViaWork: false
            }, { shouldValidate: false, shouldDirty: true });
          }
          setPhase('prefilter');
          setShowPrefilterErrors(false);
        } else {
          setCurrentStep(2);
          form.setValue('currentStep', 2);
        }
        return;
      }
      // phase === 'prefilter'
      if (isPreFilteringValid) {
        setCurrentStep(2);
        form.setValue('currentStep', 2);
        setPhase('type');
        setShowPrefilterErrors(false);
      } else {
        setShowPrefilterErrors(true);
      }
      return;
    }

    // Étape 2
    if (currentStep === 2 && step2Blocked) {
      setStep2ShowErrors(true);
      return;
    }

    // Étape 3
    if (currentStep === 3 && step3Blocked) {
      setStep3ShowErrors(true);
      return;
    }

    // Étape 4
    if (currentStep === 4 && step4Blocked) {
      setStep4ShowErrors(true);
      return;
    }

    // Étape 5 (Jeunes/Étudiant) si flow étudiant
    if (currentStep === 5 && isStudentFlow && step5Blocked) {
      setStep5ShowErrors(true);
      return;
    }

    // Étape consentements (5 ou 6)
    if (isConsentStep && step6Blocked) {
      setStep6ShowErrors(true);
      return;
    }

    const n = nextStep(currentStep);
    setCurrentStep(n);
    form.setValue('currentStep', n);
  };

  // Previous
  const handlePrevious = () => {
    if (currentStep === 1 && phase === 'prefilter') {
      setPhase('type');
      setShowPrefilterErrors(false);
      return;
    }
    if (currentStep === 2) {
      if (typeDemande === 'Inscription') {
        setCurrentStep(1);
        form.setValue('currentStep', 1);
        setPhase('prefilter');
      } else {
        setCurrentStep(1);
        form.setValue('currentStep', 1);
        setPhase('type');
      }
      return;
    }
    const p = prevStep(currentStep);
    setCurrentStep(p);
    form.setValue('currentStep', p);
  };

  const handleReset = () => {
    if (confirm('Êtes-vous sûr de vouloir recommencer ? Toutes les données seront perdues.')) {
      form.reset(defaultFormData);
      setCurrentStep(1);
      setPhase('type');
      setShowPrefilterErrors(false);

      setStep2ShowErrors(false); setStep2Blocked(true);
      setStep3ShowErrors(false); setStep3Blocked(true);
      setStep4ShowErrors(false); setStep4Blocked(true);
      setStep5ShowErrors(false); setStep5Blocked(true);
      setStep6ShowErrors(false); setStep6Blocked(true);

      if (userEmail) clearSavedData(userEmail);
    }
  };

  // Rendu
  const renderCurrentStep = () => {
    if (currentStep === 1) {
      return (
        <div className="space-y-6">
          {phase === 'type' && (
            <Step1TypeDemande
              form={form}
              testMode={testMode}
              onTypeChange={(v) => { if (v !== 'Inscription') setPhase('type'); }}
            />
          )}
          {phase === 'prefilter' && (
            <PreFiltering form={form} testMode={testMode} showErrors={showPrefilterErrors} />
          )}
        </div>
      );
    }

    if (currentStep === 2) {
      return (
        <Step2Menage
          form={form}
          testMode={testMode}
          onValidityChange={(blocked) => setStep2Blocked(blocked)}
          showBlocking={step2ShowErrors}
        />
      );
    }

    if (currentStep === 3) {
      return (
        <Step3Logement
          form={form}
          testMode={testMode}
          onValidityChange={(blocked) => setStep3Blocked(blocked)}
          showBlocking={step3ShowErrors}
        />
      );
    }

    if (currentStep === 4) {
      return (
        <Step4Finances
          form={form}
          testMode={testMode}
          onValidityChange={(blocked) => setStep4Blocked(blocked)}
          showBlocking={step4ShowErrors}
        />
      );
    }

    if (currentStep === 5) {
      return isStudentFlow ? (
        <Step5JeunesEtudiant
          form={form}
          testMode={testMode}
          onValidityChange={(blocked) => setStep5Blocked(testMode ? false : blocked)}
          showBlocking={step5ShowErrors}
        />
      ) : (
        <Step6Consentements
          hasOtherAdults={hasOtherAdults}
          onValidityChange={(blocked) => setStep6Blocked(testMode ? false : blocked)}
          showBlocking={step6ShowErrors}
        />
      );
    }

    if (currentStep === 6) {
      return isStudentFlow ? (
        <Step6Consentements
          hasOtherAdults={hasOtherAdults}
          onValidityChange={(blocked) => setStep6Blocked(testMode ? false : blocked)}
          showBlocking={step6ShowErrors}
        />
      ) : (
        <Step7Recap form={form} testMode={testMode} />
      );
    }

    if (currentStep === 7) {
      return <Step7Recap form={form} testMode={testMode} />;
    }

    return (
      <Card>
        <CardContent className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Étape {currentStep}</h2>
          <p className="text-muted-foreground mb-6">Cette étape est en cours de développement.</p>
          <Badge variant="outline">Prochainement disponible</Badge>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8 text-center">
          <p className="text-muted-foreground">Formulaire de demande pour les Logements à Loyer Modéré</p>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="test-mode"
                    checked={testMode}
                    onCheckedChange={setTestMode}
                    aria-describedby="test-mode-description"
                  />
                  <Label htmlFor="test-mode" className="cursor-pointer">Mode test</Label>
                </div>
                <p id="test-mode-description" className="text-xs text-muted-foreground">
                  Validations d'étape désactivées
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                aria-label="Recommencer le formulaire"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        <FormProgress
          currentStep={currentStep}
          totalSteps={totalSteps}
          testMode={testMode}
          isStudentFlow={isStudentFlow}
        />

        <form onSubmit={form.handleSubmit(() => {})}>
          <AnimatePresence mode="wait">
            <motion.div
              key={`${currentStep}-${phase}-${isStudentFlow}`}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              {renderCurrentStep()}
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-between items-center mt-8">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1 && phase === 'type'}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Précédent
            </Button>

            <div className="flex gap-4">
              {currentStep < totalSteps ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={currentStep === 1 && phase === 'type' && !typeDemande}
                  className="flex items-center gap-2"
                >
                  Suivant
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  className="flex items-center gap-2"
                  disabled={!isPreFilteringValid && !testMode}
                >
                  Soumettre la demande
                </Button>
              )}
            </div>
          </div>
        </form>

        {testMode && (
          <Card className="mt-8 border-yellow-200 bg-yellow-50">
            <CardContent className="p-4">
              <h3 className="font-medium text-yellow-800 mb-2">Debug Info (Mode Test)</h3>
              <div className="text-xs text-yellow-700 space-y-1">
                <p>Étape actuelle: {currentStep}/{totalSteps}</p>
                <p>Phase étape 1: {phase}</p>
                <p>Type de demande: {String(typeDemande)}</p>
                <p>Flow étudiant: {isStudentFlow ? 'Oui' : 'Non'}</p>
                <p>Âge preneur: {preneurAge ?? 'inconnu'}</p>
                <p>Pré-filtrage valide (ou test): {isPreFilteringValid ? 'Oui' : 'Non'}</p>
                <p>Étape 2 bloquée: {step2Blocked ? 'Oui' : 'Non'}</p>
                <p>Affichage erreurs Étape 2: {step2ShowErrors ? 'Oui' : 'Non'}</p>
                <p>Étape 3 bloquée: {step3Blocked ? 'Oui' : 'Non'}</p>
                <p>Affichage erreurs Étape 3: {step3ShowErrors ? 'Oui' : 'Non'}</p>
                <p>Étape 4 bloquée: {step4Blocked ? 'Oui' : 'Non'}</p>
                <p>Affichage erreurs Étape 4: {step4ShowErrors ? 'Oui' : 'Non'}</p>
                <p>Étape 5 (Jeunes) bloquée: {step5Blocked ? 'Oui' : 'Non'}</p>
                <p>Affichage erreurs Étape 5: {step5ShowErrors ? 'Oui' : 'Non'}</p>
                <p>Étape 6 (Consentements) bloquée: {step6Blocked ? 'Oui' : 'Non'}</p>
                <p>Affichage erreurs Étape 6: {step6ShowErrors ? 'Oui' : 'Non'}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default App;
