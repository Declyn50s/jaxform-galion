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

// ---------- Types locaux
type PhaseStep1 = 'type' | 'prefilter';

const defaultFormData: FormData = {
  typeDemande: 'Inscription' as any,
  members: [],
  logement: {
    pieces: 2,
    loyerMensuelCHF: 0,
    motif: ''
  },
  finances: [],
  consentements: {
    traitementDonnees: false,
    conditionsGenerales: false
  },
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
  const totalSteps = 7; // le prefilter N'EST PAS une étape
  const [testMode, setTestMode] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [phase, setPhase] = useState<PhaseStep1>('type');      // sous-phase de l'étape 1
  const [showPrefilterErrors, setShowPrefilterErrors] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultFormData,
    mode: 'onChange'
  });

  const { clearSavedData } = useAutoSave(form.watch(), userEmail);

  // Watch pour la logique
  const typeDemande = form.watch('typeDemande');
  const preFiltering = form.watch('preFiltering');

  // Si on quitte "Inscription" → sortir de la sous-phase + purge preFiltering
  useEffect(() => {
    if (typeDemande !== 'Inscription') {
      if (phase === 'prefilter') setPhase('type');
      if (preFiltering && Object.keys(preFiltering || {}).length) {
        form.setValue('preFiltering', undefined, { shouldValidate: false, shouldDirty: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeDemande]);

  // Valid pré-filtrage (ou bypass testMode)
  const isPreFilteringValid =
    testMode ||
    (!!preFiltering &&
      (preFiltering.habiteLausanne3Ans === true ||
       preFiltering.travailleLausanne3Ans === true));

  // Navigation
  const handleNext = () => {
    if (currentStep === 1) {
      if (phase === 'type') {
        if (typeDemande === 'Inscription') {
          if (!preFiltering) {
            form.setValue('preFiltering', {}, { shouldValidate: false, shouldDirty: true });
          }
          setPhase('prefilter');           // remplace l'affichage, même étape
          setShowPrefilterErrors(false);
        } else {
          setCurrentStep(2);               // passe à l'étape 2 directe
          form.setValue('currentStep', 2);
        }
        return;
      } 
      // phase === 'prefilter'
      if (isPreFilteringValid) {
        setCurrentStep(2);
        form.setValue('currentStep', 2);
        setPhase('type');                  // reset phase pour de futurs retours
        setShowPrefilterErrors(false);
      } else {
        setShowPrefilterErrors(true);      // bloque tant que pas valide (hors testMode)
      }
      return;
    }

    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
      form.setValue('currentStep', currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep === 1 && phase === 'prefilter') {
      setPhase('type');                    // retour à Step1 sans changer d'étape
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
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      form.setValue('currentStep', currentStep - 1);
    }
  };

  const handleReset = () => {
    if (confirm('Êtes-vous sûr de vouloir recommencer ? Toutes les données seront perdues.')) {
      form.reset(defaultFormData);
      setCurrentStep(1);
      setPhase('type');
      setShowPrefilterErrors(false);
      if (userEmail) clearSavedData(userEmail);
    }
  };

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
      onValidityChange={(blocked)=>{/* optionnel: gérer le bouton Suivant */}}
    />
  );
}
if (currentStep === 3) {
  return <Step3Logement form={form} testMode={testMode} />;
}
if (currentStep === 4) {
    return <Step4Finances form={form} testMode={testMode} />;
  }
  if (currentStep === 5) {
  return <Step5JeunesEtudiant form={form} testMode={testMode} />;
}
if (currentStep === 6) {
  return <Step6Consentements form={form} testMode={testMode} />;
}
if (currentStep ===7) {
  return <Step7Recap form={form} testMode={testMode} />;
}

    // Placeholder autres étapes
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Étape {currentStep}</h2>
          <p className="text-muted-foreground mb-6">
            Cette étape est en cours de développement.
          </p>
          <Badge variant="outline">Prochainement disponible</Badge>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">

        {/* Header */}
        <div className="mb-8 text-center">
          {/*<h1 className="text-3xl font-bold text-gray-900 mb-2">Demande de logement LLM</h1>*/}
          <p className="text-muted-foreground">Formulaire de demande pour les Logements à Loyer Modéré</p>
        </div>

        {/* Controls */}
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

        {/* Progress (ne compte pas la sous-phase) */}
        <FormProgress currentStep={currentStep} totalSteps={totalSteps} testMode={testMode} />

        {/* Form Content */}
        <form onSubmit={form.handleSubmit(() => {})}>
          <AnimatePresence mode="wait">
            <motion.div
              key={`${currentStep}-${phase}`} // clé inclut la phase pour une transition propre
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              {renderCurrentStep()}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
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
                  // À l’écran "type", on bloque Suivant si aucun type choisi
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

        {/* Debug (mode test) */}
        {testMode && (
          <Card className="mt-8 border-yellow-200 bg-yellow-50">
            <CardContent className="p-4">
              <h3 className="font-medium text-yellow-800 mb-2">Debug Info (Mode Test)</h3>
              <div className="text-xs text-yellow-700 space-y-1">
                <p>Étape actuelle: {currentStep}/{totalSteps}</p>
                <p>Phase étape 1: {phase}</p>
                <p>Type de demande: {String(typeDemande)}</p>
                <p>Pré-filtrage valide (ou test): {isPreFilteringValid ? 'Oui' : 'Non'}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default App;
