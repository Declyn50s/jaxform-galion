import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, ExternalLink } from 'lucide-react';
import { FormData } from '@/types/form';
import { motion, AnimatePresence } from 'framer-motion';

interface PreFilteringProps {
  form: UseFormReturn<FormData>;
  testMode: boolean;
  showErrors?: boolean;
}

export function PreFiltering({ form, testMode, showErrors }: PreFilteringProps) {
  const { watch, setValue } = form;

  const preFiltering = watch('preFiltering') || {};
  const typeDemande = watch('typeDemande');

  // Affiché uniquement pour "Inscription"
  const showLivingQuestion = typeDemande === 'Inscription';
  const showWorkQuestion = showLivingQuestion && preFiltering.habiteLausanne3Ans === false;
  const isBlocked =
    showWorkQuestion &&
    preFiltering.travailleLausanne3Ans === false;

  // Valid = habite 3 ans OU travaille 3 ans
  const isValid =
    preFiltering.habiteLausanne3Ans === true ||
    preFiltering.travailleLausanne3Ans === true;

  const handleLivingResponse = (response: boolean) => {
    setValue('preFiltering.habiteLausanne3Ans' as any, response, { shouldValidate: true, shouldDirty: true });
    if (response) {
      // Si "oui" au domicile, nettoie les champs travail
      setValue('preFiltering.travailleLausanne3Ans' as any, undefined, { shouldValidate: false, shouldDirty: true });
      setValue('preFiltering.flagViaWork' as any, false, { shouldValidate: false, shouldDirty: true });
    }
  };

  const handleWorkResponse = (response: boolean) => {
    setValue('preFiltering.travailleLausanne3Ans' as any, response, { shouldValidate: true, shouldDirty: true });
    setValue('preFiltering.flagViaWork' as any, !!response, { shouldValidate: false, shouldDirty: true });
  };

  const suggestions = [
    { title: "LLA : Logements à Loyer Abordable", description: "Logements à loyers modérés hors dispositif LLM", url: "https://www.lausanne.ch/vie-pratique/logement/logements-utilite-publique/logement-loyer-abordable.html" },
    { title: "LE : Logements Étudiants", description: "Offre dédiée aux étudiant·e·s", url: "https://www.lausanne.ch/vie-pratique/logement/logements-utilite-publique/logements-etudiants-le.html" },
    { title: "LS : Logements Séniors", description: "Solutions adaptées dès 60 ans", url: "https://www.lausanne.ch/vie-pratique/logement/logements-utilite-publique/logements-seniors.html" },
    { title: "Logements à loyer libre de la Ville de Lausanne", description: "Annonces hors critères LLM", url: "https://www.homegate.ch/louer/biens-immobiliers/liste-annonces?a=d038&l=neutral&incsubs=1" }
  ];

  if (!showLivingQuestion) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Conditions d'éligibilité — Lausanne</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Message d’erreur global si on a tenté Suivant sans remplir correctement */}
          {showErrors && !isValid && (
            <Alert variant="destructive" role="alert" aria-live="polite">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-1">Complétez le pré-filtrage</div>
                <p className="text-sm">Vous devez satisfaire au moins une condition (habiter OU travailler à Lausanne depuis 3 ans).</p>
              </AlertDescription>
            </Alert>
          )}

          {/* Notice */}
          <Alert role="region" aria-labelledby="lausanne-notice">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div id="lausanne-notice" className="font-medium mb-2">Important</div>
              <p className="text-sm">
                Les communes alentours (Renens, Prilly, Le Mont-sur-Lausanne, etc.) ne sont pas <strong>Lausanne</strong>.<br></br>
                Seule la <strong>commune de Lausanne</strong> est acceptée pour ces critères.
              </p>
            </AlertDescription>
          </Alert>

          {/* Question domicile */}
          <div className="space-y-4">
            <Label className="text-base font-medium">
              Habitez-vous à Lausanne depuis 3 ans et sans interruption ?
            </Label>

            <div className="flex gap-4" role="radiogroup" aria-labelledby="living-question">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="habiteLausanne"
                  checked={preFiltering.habiteLausanne3Ans === true}
                  onChange={() => handleLivingResponse(true)}
                  className="h-4 w-4 text-primary focus:ring-2 focus:ring-primary"
                />
                <span>Oui</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="habiteLausanne"
                  checked={preFiltering.habiteLausanne3Ans === false}
                  onChange={() => handleLivingResponse(false)}
                  className="h-4 w-4 text-primary focus:ring-2 focus:ring-primary"
                />
                <span>Non</span>
              </label>
            </div>

            {preFiltering.habiteLausanne3Ans === true && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-green-50 border border-green-200 rounded-lg"
              >
                <p className="text-sm text-green-800 font-medium">
                  ✓ Condition remplie. Vous pouvez continuer votre demande.
                </p>
              </motion.div>
            )}
          </div>

          {/* Question travail (si domicile = non) */}
          <AnimatePresence>
            {showWorkQuestion && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                <Label className="text-base font-medium">
                  Travaillez-vous à Lausanne depuis 3 ans et sans interruption ? <br>
                  </br>(en tant que revenu principal du ménage)
                </Label>

                <div className="flex gap-4" role="radiogroup" aria-labelledby="work-question">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="travailleLausanne"
                      checked={preFiltering.travailleLausanne3Ans === true}
                      onChange={() => handleWorkResponse(true)}
                      className="h-4 w-4 text-primary focus:ring-2 focus:ring-primary"
                    />
                    <span>Oui</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="travailleLausanne"
                      checked={preFiltering.travailleLausanne3Ans === false}
                      onChange={() => handleWorkResponse(false)}
                      className="h-4 w-4 text-primary focus:ring-2 focus:ring-primary"
                    />
                    <span>Non</span>
                  </label>
                </div>

                {preFiltering.travailleLausanne3Ans === true && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-green-50 border border-green-200 rounded-lg"
                  >
                    <p className="text-sm text-green-800 font-medium mb-2">
                      ✓ Condition remplie via le travail.
                    </p>
                    <p className="text-xs text-green-700">
                      Des justificatifs prouvant que votre travail était à Lausanne pendant 3 ans
                      seront requis à l'étape "Finances".
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Blocage + suggestions si domicile = non ET travail = non */}
          <AnimatePresence>
            {isBlocked && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-4"
              >
                <Alert variant="destructive" role="alert" aria-live="polite">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-2">Demande non éligible</div>
                    <p className="text-sm mb-4">
                      Pour une demande d'inscription LLM, vous devez soit habiter à Lausanne depuis 3 ans,
                      soit y travailler depuis 3 ans sans interruption.
                    </p>
                    {testMode && (
                      <p className="text-sm italic">
                        Mode test : Vous pouvez continuer mais cette condition bloquante
                        sera vérifiée à la soumission finale.
                      </p>
                    )}
                  </AlertDescription>
                </Alert>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Suggestions automatiques</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground mb-4">
                      D'autres solutions de logement pourraient vous convenir :
                    </p>

                    <div className="grid gap-3">
                      {suggestions.map((suggestion, index) => (
                        <div key={index} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-sm mb-1">
                                {suggestion.title}
                              </h4>
                              <p className="text-xs text-muted-foreground mb-2">
                                {suggestion.description}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              asChild
                              className="text-primary hover:text-primary/80"
                            >
                              <a
                                href={suggestion.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`Ouvrir ${suggestion.title} dans un nouvel onglet`}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}
