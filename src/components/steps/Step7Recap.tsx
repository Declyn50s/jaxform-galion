// src/components/steps/Step7Recap.tsx
import React, { useMemo, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
// import { Separator } from "@/components/ui/separator"; // pas utilisé
import { jsPDF } from "jspdf";
import { CheckCircle2, Send, FileDown } from "lucide-react"; // AlertTriangle pas utilisé

import { FormData } from "@/types/form";
import {
  computeHouseholdSummary,
  buildMissingDocs,
  runCriticalValidations,
  buildRefusalSuggestions,
  generateReference
} from "@/lib/recap";

// Type local minimal pour pendingLater (extrait de Step4Finances)
type PendingLaterItem = {
  memberName: string;
  sourceLabel: string;
  label: string;
};

type Props = {
  form: UseFormReturn<FormData>;
  onSubmitted?: (payload: { ref: string; at: string }) => void;
};

export default function Step7Recap({ form, onSubmitted }: Props) {
  const data = form.watch(); // on lit tout pour le récap
  const [ack, setAck] = useState<{ ref: string; at: string } | null>(null);

  const household = useMemo(() => computeHouseholdSummary(data), [data]);
  const missingRaw = useMemo(() => buildMissingDocs(data), [data]);
  const critical = useMemo(() => runCriticalValidations(data), [data]);

  // Gardes robustes (évite les "cannot read length of undefined")
  const missing = {
    warningDocs: missingRaw?.warningDocs ?? [],
    joinLater:   missingRaw?.joinLater ?? [],
    blockingDocs: missingRaw?.blockingDocs ?? [],
    permitNotice: missingRaw?.permitNotice ?? null,
  };

  const canSubmit = critical.refus.length === 0 && missing.blockingDocs.length === 0;

  // Remplace les espaces fines/insécables et ponctuation “smart” par des équivalents sûrs pour jsPDF
const sanitizePdfText = (s: string) =>
  (s ?? "")
    // espaces spéciales -> espace normal
    .replace(/[\u202F\u2009\u00A0]/g, " ")
    // apostrophes / guillemets typographiques -> ASCII
    .replace(/[\u2019\u2032]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    // tirets en/em -> tiret simple
    .replace(/[\u2013\u2014]/g, "-")
    // guillemets français -> "
    .replace(/[\u00AB\u00BB]/g, '"');

const handleDownloadPdf = (ref: string, at: string) => {
  const doc = new jsPDF();
  doc.setFont("arial", "normal");
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - margin * 2;
  const pageBottom = 280; // approx pour A4 en unités jsPDF par défaut
  let y = 18;

  const newPage = () => {
    doc.addPage();
    y = 18;
  };

  const ensureSpace = (needed = 6) => {
    if (y + needed > pageBottom) newPage();
  };

  const addTitle = (txt: string) => {
    ensureSpace(10);
    doc.setFontSize(14);
    doc.text(txt, margin, y);
    y += 8;
  };

  const addSection = (title: string) => {
    ensureSpace(10);
    doc.setFontSize(12);
    doc.text(title, margin, y);
    y += 6;
    doc.setFontSize(10);
  };

  const addParagraph = (text: string) => {
    const lines = doc.splitTextToSize(text, contentWidth);
    for (const line of lines) {
      ensureSpace(6);
      doc.text(line, margin, y);
      y += 5;
    }
    y += 2;
  };

  const addBullets = (items: string[]) => {
    for (const item of items) {
      const lines = doc.splitTextToSize(`• ${item}`, contentWidth);
      for (const line of lines) {
        ensureSpace(6);
        doc.text(line, margin, y);
        y += 5;
      }
    }
  };

  // --- En-tête
  addTitle("Récapitulatif de la demande LLM");
  doc.setFontSize(10);
  doc.text(`Référence: ${ref}`, margin, y); y += 6;
  doc.text(`Soumis le: ${at}`, margin, y); y += 10;

  // --- Vue d’ensemble
  addSection("Vue d’ensemble");
  addParagraph(`Type de demande: ${household.typeDemande ?? "-"}`);
  addParagraph(`Ménage: ${household.nbAdults} adultes, ${household.nbChildren} enfants (+${household.nbExcludedChildren} non comptés)`);
  addParagraph(`Exclus (permis): ${household.nbExcludedByPermit}`);
  addParagraph(`Pièces max (règle): ${String(household.piecesMaxRegle)}`);

  // --- Avertissements
  addSection("Avertissements");

  // Bloc Information — titres de séjour (si présent)
  if (missing.permitNotice) {
    // sous-titre
    doc.setFont("arial", "bold");
    addParagraph("Information — titres de séjour");
    doc.setFont("arial", "normal");

    // notice
    addParagraph(missing.permitNotice.notice);

    // détails par personne (lignes)
    if (missing.permitNotice.lines?.length) {
      addBullets(missing.permitNotice.lines);
    }
  }

  // Autres avertissements
  if (missing.warningDocs.length) {
    addBullets(missing.warningDocs);
  } else {
    addParagraph("—");
  }

  // --- Documents manquants à joindre plus tard
  addSection("Documents manquants à joindre");
  const pendingLater: PendingLaterItem[] = form.watch("pendingLater") || [];
  if (pendingLater.length) {
    addBullets(
      pendingLater.map(p => `${p.memberName} — ${p.sourceLabel} : ${p.label}`)
    );
  } else {
    addParagraph("—");
  }

  // --- Validations critiques
  addSection("Validations critiques");
  addParagraph(`Refus: ${critical.refus.length ? critical.refus.join(" | ") : "—"}`);
  addParagraph(`Erreurs de champ: ${critical.fieldErrors.length ? critical.fieldErrors.join(" | ") : "—"}`);

  // --- Sauvegarde
  doc.save(`LLM-${ref}.pdf`);
};


  const pendingLater: PendingLaterItem[] = form.watch("pendingLater") || [];

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
            <div>Date : <span className="font-medium">{new Date().toLocaleDateString()}</span></div>
            <div>Type de demande : <span className="font-medium">{household.typeDemande ?? "-"}</span></div>
            <div>Ménage : <span className="font-medium">{household.nbAdults}</span> adulte(s) et <span className="font-medium">{household.nbChildren}</span> enfant(s) <span className="text-muted-foreground">( +{household.nbExcludedChildren} non comptés )</span></div>
            <div>Pièces max (prévisionnel) : <span className="font-medium">{String(household.piecesMaxRegle)}</span> pièces</div>
            <div>Délai de traitement de <strong>30 jours ouvrables</strong></div>
            <div><i>Une réponse vous sera adressée par voie postale dans un délai de 30 jours ouvrables.
Il est donc inutile de visiter les logements à loyer modéré vacants sans avoir préalablement reçu notre réponse.</i></div>
          </div>

          <div role="separator" className="my-4 h-px w-full bg-border" />

          {/* Documents manquants */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium">Avertissement</h3>
              <ul className="mt-2 text-sm list-disc pl-4">
                {missing.warningDocs.length ? missing.warningDocs.map((d) => <li key={d}>{d}</li>) : <li>—</li>}
              </ul>
            </div>
            <div>
              <h3 className="font-medium">Documents manquants à joindre</h3>
              <ul className="mt-2 text-sm list-disc pl-4">
                {pendingLater.length
                  ? pendingLater.map((p, k) => (
                      <li key={k}>
                        {p.memberName} — {p.sourceLabel} : {p.label}
                      </li>
                    ))
                  : <li>—</li>}
              </ul>
            </div>
          </div>

          {/* Bloc Information — titres de séjour */}
  {missing.permitNotice && (
    <div className="mt-2 rounded-md border border-yellow-300 bg-yellow-50 p-3 space-y-2">
      <p className="font-medium text-yellow-800">Information — titres de séjour</p>
      <p className="whitespace-pre-line text-sm text-yellow-900">
        {missing.permitNotice.notice}
      </p>
      {missing.permitNotice.lines?.length > 0 && (
        <ul className="list-disc pl-5 text-sm text-yellow-900">
          {missing.permitNotice.lines.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      )}
    </div>
  )}

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
