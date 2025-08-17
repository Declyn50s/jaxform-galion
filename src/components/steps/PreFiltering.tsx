import React from "react";
import { UseFormReturn } from "react-hook-form";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { FormData } from "@/types/form";
import { motion, AnimatePresence } from "framer-motion";
import * as RadioGroup from "@radix-ui/react-radio-group";

type Boolish = boolean | undefined;

function YesNoField({
  name,
  legend,
  help,
  value,
  onChange,
  includeUnknown = false,
  "aria-describedby": ariaDescribedby,
}: {
  name: string;
  legend: string;
  help?: string;
  value: Boolish;
  onChange: (v: Boolish) => void;
  includeUnknown?: boolean;
  "aria-describedby"?: string;
}) {
  // Raccourcis clavier Y/N/?
  const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key.toLowerCase() === "y") onChange(true);
    if (e.key.toLowerCase() === "n") onChange(false);
    if (includeUnknown && (e.key === "?" || e.key.toLowerCase() === "u")) onChange(undefined);
  };

  return (
    <fieldset className="space-y-2" aria-describedby={ariaDescribedby}>
      <legend id={`${name}-legend`} className="text-base font-medium">{legend}</legend>
      {help && (
        <p id={`${name}-help`} className="text-sm text-muted-foreground">
          {help}
        </p>
      )}

      <RadioGroup.Root
        aria-labelledby={`${name}-legend`}
        value={value === true ? "yes" : value === false ? "no" : undefined} // ← pas ""
        onValueChange={(v) => onChange(v === "yes" ? true : v === "no" ? false : undefined)}
        className="grid grid-cols-1 sm:grid-cols-3 gap-3"
        onKeyDown={onKeyDown}
      >
        <RadioCard
          id={`${name}-yes`}
          value="yes"
          title="Oui"
          icon={<CheckCircle2 className="h-5 w-5" />}
          selected={value === true}
        />
        <RadioCard
          id={`${name}-no`}
          value="no"
          title="Non"
          icon={<XCircle className="h-5 w-5" />}
          selected={value === false}
        />
      </RadioGroup.Root>
    </fieldset>
  );
}

function RadioCard({
  id,
  value,
  title,
  description,
  icon,
  selected,
}: {
  id: string;
  value: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  selected?: boolean;
}) {
  return (
    <RadioGroup.Item
      id={id}
      value={value}
      className={[
        "group relative rounded-2xl border p-4 text-left",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary",
        selected ? "border-primary ring-1 ring-primary bg-primary/5" : "hover:bg-muted",
      ].join(" ")}
      aria-checked={selected}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{icon}</div>
        <div className="flex-1">
          <div className="font-medium">{title}</div>
          {description && <div className="text-xs text-muted-foreground">{description}</div>}
        </div>
        <div
          className={[
            "absolute right-3 top-3 h-2.5 w-2.5 rounded-full",
            selected ? "bg-primary" : "bg-muted-foreground/30",
          ].join(" ")}
          aria-hidden="true"
        />
      </div>
    </RadioGroup.Item>
  );
}

interface PreFilteringProps {
  form: UseFormReturn<FormData>;
  testMode: boolean;
  showErrors?: boolean;
}

export function PreFiltering({ form, testMode, showErrors }: PreFilteringProps) {
  const { watch, setValue } = form;
  const preFiltering = watch("preFiltering") || {};
  const typeDemande = watch("typeDemande");

  const showLivingQuestion = typeDemande === "Inscription";
  const showWorkQuestion = showLivingQuestion && preFiltering.habiteLausanne3Ans === false;

  // Valid = habite 3 ans OU travaille 3 ans
  const isValid =
    preFiltering.habiteLausanne3Ans === true || preFiltering.travailleLausanne3Ans === true;

  const setLiving = (v: Boolish) => {
    setValue("preFiltering.habiteLausanne3Ans" as any, v, { shouldValidate: true, shouldDirty: true });
    if (v === true) {
      setValue("preFiltering.travailleLausanne3Ans" as any, undefined, { shouldValidate: false, shouldDirty: true });
      setValue("preFiltering.flagViaWork" as any, false, { shouldValidate: false, shouldDirty: true });
    }
  };

  const setWork = (v: Boolish) => {
    setValue("preFiltering.travailleLausanne3Ans" as any, v, { shouldValidate: true, shouldDirty: true });
    setValue("preFiltering.flagViaWork" as any, v === true, { shouldValidate: false, shouldDirty: true });
  };

  const suggestions = [
    { title: "LLA : Logements à Loyer Abordable", description: "Logements à loyers modérés hors dispositif LLM", url: "https://www.lausanne.ch/vie-pratique/logement/logements-utilite-publique/logement-loyer-abordable.html" },
    { title: "LE : Logements Étudiants", description: "Offre dédiée aux étudiant·e·s", url: "https://www.lausanne.ch/vie-pratique/logement/logements-utilite-publique/logements-etudiants-le.html" },
    { title: "LS : Logements Séniors", description: "Solutions adaptées dès 60 ans", url: "https://www.lausanne.ch/vie-pratique/logement/logements-utilite-publique/logements-seniors.html" },
    { title: "Logements à loyer libre de la Ville de Lausanne", description: "Annonces hors critères LLM", url: "https://www.homegate.ch/louer/biens-immobiliers/liste-annonces?a=d038&l=neutral&incsubs=1" },
  ];

  if (!showLivingQuestion) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Conditions d’éligibilité — Lausanne</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">

          {showErrors && !isValid && (
            <Alert variant="destructive" role="alert" aria-live="polite">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-1">Complétez le pré-filtrage</div>
                <p className="text-sm">Il faut satisfaire au moins une condition : habiter OU travailler à Lausanne depuis 3 ans.</p>
              </AlertDescription>
            </Alert>
          )}

          {/* Domicile */}
          <YesNoField
            name="habiteLausanne3Ans"
            legend="Habitez-vous actuellement à Lausanne depuis 3 ans et sans interruption ?"
            value={preFiltering.habiteLausanne3Ans}
            onChange={setLiving}
            includeUnknown
            aria-describedby="lausanne-notice"
          />

          <AnimatePresence>
            {preFiltering.habiteLausanne3Ans === true && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800 font-medium">✓ Condition “domicile” remplie. Vous pouvez continuer.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Travail si domicile = non */}
          <AnimatePresence>
            {preFiltering.habiteLausanne3Ans === false && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-4">
                <YesNoField
                  name="travailleLausanne3Ans"
                  legend="Travaillez-vous actuellement à Lausanne depuis 3 ans et sans interruption ? 
                  (en tant que revenu principal du ménage)"
                  value={preFiltering.travailleLausanne3Ans}
                  onChange={setWork}
                />

                {preFiltering.travailleLausanne3Ans === true && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800 font-medium mb-1">✓ Condition “travail” remplie.</p>
                      <p className="text-xs text-green-700">
                        Des justificatifs seront requis à l’étape <strong>Finances</strong> (contrats, attestations, certificats de salaire).
                      </p>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Notice cadrage géo */}
          <Alert role="region" aria-labelledby="lausanne-notice">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div id="lausanne-notice" className="font-medium mb-2">Important</div>
              <p className="text-sm">
                Les communes alentours (Renens, Prilly, Le Mont-sur-Lausanne, etc.) ne sont pas <strong>Lausanne</strong>. Seule la <strong>commune de Lausanne</strong> est acceptée pour ces critères.
              </p>
            </AlertDescription>
          </Alert>

          {/* Blocage + suggestions si domicile = non ET travail = non */}
          <AnimatePresence>
            {showWorkQuestion && preFiltering.travailleLausanne3Ans === false && (
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="space-y-4">
                <Alert variant="destructive" role="alert" aria-live="polite">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-2">Demande non éligible</div>
                    <p className="text-sm mb-4">Vous devez soit habiter Lausanne depuis 3 ans, soit y travailler depuis 3 ans sans interruption.</p>
                    {testMode && <p className="text-sm italic">Mode test : vous pouvez continuer, mais cette condition bloquante sera vérifiée à la soumission.</p>}
                  </AlertDescription>
                </Alert>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Alternatives possibles</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">Ces options pourraient mieux correspondre :</p>
                    <div className="grid gap-3">
                      {suggestions.map((s, i) => (
                        <div key={i} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-sm mb-1">{s.title}</h4>
                              <p className="text-xs text-muted-foreground mb-2">{s.description}</p>
                            </div>
                            <Button type="button" variant="ghost" size="sm" asChild className="text-primary hover:text-primary/80">
                              <a href={s.url} target="_blank" rel="noopener noreferrer" aria-label={`Ouvrir ${s.title} dans un nouvel onglet`}>
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