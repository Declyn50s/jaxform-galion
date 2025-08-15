// src/components/steps/Step7Recap.tsx
import React, { useMemo, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator"; // <- manquant
import { jsPDF } from "jspdf";                          // <- manquant
import { AlertTriangle, CheckCircle2, Send, FileDown } from "lucide-react"; // <- manquant

import { FormData } from "@/types/form";
import {
  computeHouseholdSummary,
  buildMissingDocs,
  runCriticalValidations,
  buildRefusalSuggestions,
  generateReference
} from "@/lib/recap";

type Props = {
  form: UseFormReturn<FormData>;
  onSubmitted?: (payload: { ref: string; at: string }) => void;
};

export default function Step7Recap({ form, onSubmitted }: Props) {
  const data = form.watch(); // on lit tout pour le récap
  const [ack, setAck] = useState<{ ref: string; at: string } | null>(null);

  const household = useMemo(() => computeHouseholdSummary(data), [data]);
  const missing = useMemo(() => buildMissingDocs(data), [data]);
  const critical = useMemo(() => runCriticalValidations(data), [data]);

  const canSubmit = critical.refus.length === 0 && (missing.blockingDocs.length === 0);

  const handleDownloadPdf = (ref: string, at: string) => {
    const doc = new jsPDF();

    doc.setFontSize(14);
    doc.text("Récapitulatif de la demande LLM", 14, 18);
    doc.setFontSize(10);
    doc.text(`Référence: ${ref}`, 14, 26);
    doc.text(`Soumis le: ${at}`, 14, 32);

    let y = 42;

    const addSection = (title: string) => {
      doc.setFontSize(12);
      doc.text(title, 14, y);
      y += 6;
      doc.setFontSize(10);
    };

    addSection("Vue d’ensemble");
    doc.text(`Type de demande: ${household.typeDemande ?? "-"}`, 20, y); y += 5;
    doc.text(`Ménage: ${household.nbAdults} adultes, ${household.nbChildren} enfants (+${household.nbExcludedChildren} non comptés)`, 20, y); y += 5;
    doc.text(`Exclus (permis): ${household.nbExcludedByPermit}`, 20, y); y += 5;
    doc.text(`Pièces max (règle): ${household.piecesMaxRegle}`, 20, y); y += 5;

    addSection("Documents manquants");
    doc.text(`Bloquants: ${missing.blockingDocs.length ? missing.blockingDocs.join(", ") : "—"}`, 20, y); y += 5;
    doc.text(`Warnings: ${missing.warningDocs.length ? missing.warningDocs.join(", ") : "—"}`, 20, y); y += 5;
    doc.text(`Joindre plus tard: ${missing.joinLater.length ? missing.joinLater.join(", ") : "—"}`, 20, y); y += 8;

    addSection("Validations critiques");
    doc.text(`Refus: ${critical.refus.length ? critical.refus.join(" | ") : "—"}`, 20, y); y += 5;
    doc.text(`Erreurs de champ: ${critical.fieldErrors.length ? critical.fieldErrors.join(" | ") : "—"}`, 20, y); y += 8;

    doc.save(`LLM-${ref}.pdf`);
  };

  const handleSubmit = () => {
    const { ref, at } = generateReference();
    setAck({ ref, at });
    onSubmitted?.({ ref, at });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">Récapitulatif & Soumission</h2>

          {/* Vue d’ensemble */}
          <div className="space-y-2 text-sm">
            <div>Type de demande : <span className="font-medium">{household.typeDemande ?? "-"}</span></div>
            <div>Ménage : <span className="font-medium">{household.nbAdults}</span> adultes, <span className="font-medium">{household.nbChildren}</span> enfants <span className="text-muted-foreground">( +{household.nbExcludedChildren} non comptés )</span></div>
            <div>Membre non comptés (permis de séjour invalide) : <span className="font-medium">{household.nbExcludedByPermit}</span></div>
            <div>Pièces max : <span className="font-medium">{String(household.piecesMaxRegle)}</span> pièces</div>
          </div>

          <div role="separator" className="my-4 h-px w-full bg-border" />

          {/* Documents manquants */}
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <h3 className="font-medium flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Bloquants</h3>
              <ul className="mt-2 text-sm list-disc pl-4">
                {missing.blockingDocs.length ? missing.blockingDocs.map((d) => <li key={d}>{d}</li>) : <li>—</li>}
              </ul>
            </div>
            <div>
              <h3 className="font-medium">Warnings / info</h3>
              <ul className="mt-2 text-sm list-disc pl-4">
                {missing.warningDocs.length ? missing.warningDocs.map((d) => <li key={d}>{d}</li>) : <li>—</li>}
              </ul>
            </div>
            <div>
              <h3 className="font-medium">Joindre plus tard</h3>
              <ul className="mt-2 text-sm list-disc pl-4">
                {missing.joinLater.length ? missing.joinLater.map((d) => <li key={d}>{d}</li>) : <li>—</li>}
              </ul>
            </div>
          </div>

          {/* Validations critiques */}
          <div className="space-y-2">
            <h3 className="font-medium">Validations critiques</h3>
            {critical.refus.length === 0 && critical.fieldErrors.length === 0 ? (
              <p className="text-sm text-green-700 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> OK</p>
            ) : (
              <div className="text-sm">
                {critical.refus.length > 0 && (
                  <div className="mb-2">
                    <p className="text-red-700 font-medium">Refus:</p>
                    <ul className="list-disc pl-4">
                      {critical.refus.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                )}
                {critical.fieldErrors.length > 0 && (
                  <div>
                    <p className="text-amber-700 font-medium">Erreurs de champs:</p>
                    <ul className="list-disc pl-4">
                      {critical.fieldErrors.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Redirections auto si refus */}
          {critical.refus.length > 0 && (
            <div className="rounded-lg border p-4 bg-muted/30">
              <p className="font-medium mb-2">Alternatives proposées</p>
              <ul className="text-sm space-y-1">
                {buildRefusalSuggestions().map((s) => (
                  <li key={s.title}>
                    <a className="underline" href={s.href} target="_blank" rel="noreferrer">{s.title}</a> — {s.desc}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-2">
            {!ack ? (
              <>
                <Button
                  type="button"
                  disabled={!canSubmit}
                  onClick={handleSubmit}
                  className="flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  Soumettre la demande
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canSubmit}
                  onClick={() => {
                    const { ref, at } = generateReference();
                    handleDownloadPdf(ref, at);
                  }}
                  className="flex items-center gap-2"
                >
                  <FileDown className="h-4 w-4" />
                  Exporter PDF (brouillon)
                </Button>
              </>
            ) : (
              <>
                <Badge className="text-base">Référence: {ack.ref}</Badge>
                <span className="text-sm text-muted-foreground">Soumis le {ack.at}</span>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDownloadPdf(ack.ref, ack.at)}
                  className="flex items-center gap-2"
                >
                  <FileDown className="h-4 w-4" />
                  Télécharger l’accusé (PDF)
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
