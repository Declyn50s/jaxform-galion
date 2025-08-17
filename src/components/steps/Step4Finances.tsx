// src/components/steps/Step4Finances.tsx
import React, { useEffect, useMemo, useState } from "react";
import { UseFormReturn, useWatch } from "react-hook-form";
import { FormData } from "@/types/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { FileText, Plus, Minus, AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUpload } from "@/components/FileUpload";
import { calcAge } from "@/lib/helpers";

/**
 * Modèle de données FINANCES — versions sans montants
 *
 * form.finances: Array<FinanceEntry>
 * FinanceEntry = {
 *   memberIndex: number,
 *   source: FinanceSource,
 *   pieces?: { files: File[]; later?: boolean };
 *   employeurs?: { nom: string; justificatifs?: File[] }[];
 *   autresEmployeurs?: boolean;
 *   travailALausanne?: boolean;
 *   dateDebutActivite?: string; // ISO
 *   degreInvaliditeAI?: number; // 1..100 si AI
 *   pensionRecuOuVerse?: "reçu" | "versé";
 *   formationEnCours?: boolean;
 *   formationRemuneree?: boolean;
 *   commentaire?: string;
 * }
 */

type FinanceSource =
  | "salarie"
  | "independant"
  | "pcfamille"
  | "ai"
  | "avs"
  | "pilier2"
  | "rente_pont"
  | "chomage"
  | "pc"
  | "ri"
  | "evam"
  | "pension"
  | "formation"
  | "bourse"
  | "apprentissage"
  | "autres"
  | "sans_revenu";

type PendingLater = {
  id: string; // ex: "2:salarie:pieces"
  memberIndex: number;
  memberName: string;
  source: FinanceSource;
  sourceLabel: string;
  fieldPath: string; // ex: finances[3].pieces
  label: string; // ex: "Justificatifs du revenu (bloc principal)"
};

const SOURCE_LABEL: Record<FinanceSource, string> = {
  salarie: "Salarié·e",
  independant: "Indépendant·e",
  pcfamille: "PC Famille",
  ai: "Rente AI",
  avs: "Rente AVS",
  pilier2: "2ᵉ pilier (LPP)",
  rente_pont: "Rente-pont",
  chomage: "Chômage",
  pc: "Prestation complémentaire (PC)",
  ri: "Revenu d’insertion (RI)",
  evam: "EVAM",
  pension: "Pension alimentaire",
  formation: "En formation",
  bourse: "Bourse d’études",
  apprentissage: "Apprentissage / job",
  autres: "Autres revenus",
  sans_revenu: "Sans revenu",
} as const;

// Ordre et grouping pour l’affichage
const GROUPS: { title: string; items: FinanceSource[] }[] = [
  { title: "Travail", items: ["salarie", "independant", "apprentissage"] },
  { title: "Assurances sociales / rentes", items: ["ai", "avs", "pilier2", "rente_pont", "chomage"] },
  { title: "Prestations / aides publiques", items: ["pcfamille", "pc", "ri", "evam"] },
  { title: "Obligations familiales", items: ["pension"] },
  { title: "Formation", items: ["formation", "bourse"] },
  { title: "Autres", items: ["sans_revenu", "autres"] },
];

// ---- Helpers
const todayISO = () => new Date().toISOString().slice(0, 10);
const int = (v: any) => (Number.isFinite(+v) ? Math.max(0, Math.trunc(+v)) : 0);

function membersAdults(members: any[]) {
  return (members || [])
    .map((m: any, i: number) => ({ m, i }))
    .filter(({ m }) => m?.dateNaissance && calcAge(m.dateNaissance) >= 18);
}

function displayName(m: any) {
  return [m?.prenom, m?.nom].filter(Boolean).join(" ");
}

function requiredDocsFor(entry: any, viaFlagWork: boolean): string[] {
  const s = entry?.source as FinanceSource;

  // Travail — Salarié
  if (s === "salarie") {
    return [
      "Contrat de travail",
      "6 dernières fiches de salaire",
      ...(viaFlagWork ? ["Certificats de salaire des 3 dernières années"] : []),
    ];
  }

  // Travail — Indépendant
  if (s === "independant") {
    return viaFlagWork
      ? ["Bilan fiduciaire des 3 dernières années", "Bail commercial"]
      : ["Bilan fiduciaire", "Si activité < 1 an : décision de cotisations AVS provisoire"];
  }

  // Assurances sociales / rentes
  if (s === "ai") return ["Décision AI récente", "Si > 1 an : attestation fiscale récente"];
  if (s === "avs") return ["Décision AVS récente", "Si > 1 an : attestation fiscale récente"];
  if (s === "pilier2") return ["Attestation fiscale de la rente LPP"];
  if (s === "rente_pont") return ["Décision de rente-pont"];
  if (s === "chomage") return ["Dernier décompte de chômage"];

  // Prestations / aides publiques
  if (s === "pcfamille") return ["Décision récente de PC Famille"];
  if (s === "pc") return ["Décision récente de Prestation Complémentaire (PC)"];
  if (s === "ri") return ["3 derniers budgets mensuels (RI)"];
  if (s === "evam") return ["3 derniers budgets mensuels (EVAM)"];

  // Obligations familiales
  if (s === "pension") return ["Convention ratifiée (justificatif)"];

  // Formation
  if (s === "formation") {
    return [
      "Attestation d’études",
      "Si formation rémunérée : justificatif du revenu (contrat, fiche de salaire ou décision d’allocation)",
    ];
  }

  // Apprentissage / Job
  if (s === "apprentissage") return ["Contrat", "Dernière fiche de salaire"];

  // Autres
  if (s === "bourse") return ["Avis d’octroi de bourse d’études"];
  if (s === "autres") return ["Justificatif pertinent (ex. APG : dernier décompte ou décision)"];

  // Sans revenu
  if (s === "sans_revenu") return [];

  return [];
}

function extractLaterFromFinances(
  members: any[] | undefined,
  finances: any[] | undefined,
  viaFlagWork: boolean
): PendingLater[] {
  if (!finances?.length) return [];
  const nameOf = (idx: number) => displayName(members?.[idx]) || `Personne #${idx}`;

  const list: PendingLater[] = [];
  finances.forEach((entry, idxInArray) => {
    const src = entry?.source as FinanceSource | undefined;
    if (!src) return;

    if (entry?.pieces?.later === true) {
      const docs = requiredDocsFor(entry, viaFlagWork);
      list.push({
        id: `${entry.memberIndex}:${src}:pieces`,
        memberIndex: entry.memberIndex,
        memberName: nameOf(entry.memberIndex),
        source: src,
        sourceLabel: SOURCE_LABEL[src],
        fieldPath: `finances[${idxInArray}].pieces`,
        label: docs.length ? docs.join(" · ") : "Justificatifs",
      });
    }
  });
  return list;
}

// ===== Composant principal
export function Step4Finances({
  form,
  testMode = false,
  onValidityChange,
  showBlocking = false,
}: {
  form: UseFormReturn<FormData>;
  testMode?: boolean;
  onValidityChange?: (blocked: boolean) => void;
  showBlocking?: boolean;
}) {
  const members = useWatch({ control: form.control, name: "members" }) as any[] | undefined;
  const finances = useWatch({ control: form.control, name: "finances" }) as any[] | undefined;
  const viaFlagWork = !!useWatch({ control: form.control, name: "preFiltering.flagViaWork" });

  // Snapshot centralisé des "Joindre plus tard"
  useEffect(() => {
    const pending = extractLaterFromFinances(members, finances, viaFlagWork);
    form.setValue("pendingLater" as any, pending, { shouldDirty: false, shouldValidate: false });
  }, [members, finances, viaFlagWork, form]);

  const adults = useMemo(() => membersAdults(members || []), [members]);
  const [selectedAdultIndex, setSelectedAdultIndex] = useState<number | null>(adults[0]?.i ?? null);

  // Sélecteur adulte: si la liste change, stabiliser l’index
  useEffect(() => {
    const set = new Set(adults.map((a) => a.i));
    if (selectedAdultIndex === null || !set.has(selectedAdultIndex)) {
      setSelectedAdultIndex(adults[0]?.i ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adults.length]);

  // Entrées pour l’adulte sélectionné
  const entriesForAdult = useMemo(
    () => (finances || []).filter((f: any) => f.memberIndex === selectedAdultIndex),
    [finances, selectedAdultIndex]
  );

  const upsertEntry = (partial: any) => {
    const all = [...(finances || [])];
    const idx = all.findIndex(
      (e: any) => e.memberIndex === partial.memberIndex && e.source === partial.source
    );
    const merged = {
      ...(idx >= 0 ? all[idx] : {}),
      ...partial,
    };
    if (idx >= 0) all[idx] = merged;
    else all.push(merged);
    form.setValue("finances" as any, all, { shouldDirty: true, shouldValidate: !testMode });
  };

  const removeEntry = (memberIndex: number, source: FinanceSource) => {
    const all = [...(finances || [])].filter(
      (e: any) => !(e.memberIndex === memberIndex && e.source === source)
    );
    form.setValue("finances" as any, all, { shouldDirty: true, shouldValidate: !testMode });
  };

  const toggleSource = (memberIndex: number, source: FinanceSource, checked: boolean) => {
    if (checked) {
      upsertEntry({
        memberIndex,
        source,
        pieces: { files: [], later: false },
      });
    } else {
      removeEntry(memberIndex, source);
    }
  };

  const isSourceChecked = (memberIndex: number, source: FinanceSource) =>
    entriesForAdult.some((e: any) => e.memberIndex === memberIndex && e.source === source);

  // ====== Règles / Validations locales

  // 1) Qui manque une sélection ? (au moins 1 source par adulte)
  const adultsMissing = useMemo(() => {
    if (!adults.length) return [];
    const adultIdxs = new Set(adults.map((a) => a.i));
    const hasEntry = new Map<number, boolean>();
    adultIdxs.forEach((i) => hasEntry.set(i, false));
    (finances || []).forEach((e: any) => {
      if (adultIdxs.has(e.memberIndex)) hasEntry.set(e.memberIndex, true);
    });
    return adults
      .filter(({ i }) => !hasEntry.get(i))
      .map(({ m, i }) => ({ i, name: displayName(m) || `Personne #${i + 1}` }));
  }, [adults, finances]);

  // 2) Tous les adultes "sans revenu" uniquement ?
  const adultsOnlySansRevenu = useMemo(() => {
    if (!adults.length) return false;
    const adultIdx = new Set(adults.map((a) => a.i));
    const map = new Map<number, FinanceSource[]>();
    (finances || []).forEach((e: any) => {
      if (adultIdx.has(e.memberIndex)) {
        map.set(e.memberIndex, [...(map.get(e.memberIndex) || []), e.source]);
      }
    });
    if (map.size === 0) return false;
    return [...map.values()].every(
      (arr) => arr.length > 0 && arr.every((s) => s === "sans_revenu")
    );
  }, [adults, finances]);

  // 2bis) Entrées avec justificatifs manquants (source ≠ "sans_revenu")
const entriesMissingDocs = useMemo(() => {
  const list =
    (finances || [])
      .filter((e: any) => {
        const s = e?.source as FinanceSource | undefined;
        if (!s || s === "sans_revenu") return false; // pas de pièces requises
        const filesCount = (e?.pieces?.files?.length || 0);
        const later = e?.pieces?.later === true;
        const employerHas = (e?.employeurs || []).some((emp: any) => (emp?.justificatifs?.length || 0) > 0);
        return !(later || filesCount > 0 || employerHas);
      })
      .map((e: any) => {
        const name = displayName(members?.[e.memberIndex]) || `Personne #${(e.memberIndex ?? 0) + 1}`;
        return {
          memberIndex: e.memberIndex,
          source: e.source as FinanceSource,
          name,
          sourceLabel: SOURCE_LABEL[e.source as FinanceSource],
          required: requiredDocsFor(e, viaFlagWork),
        };
      });

  return list;
}, [finances, members, viaFlagWork]);


// 3) Remontée au parent : bloqué si manque une sélection, ou tous "sans_revenu", ou pièces manquantes
useEffect(() => {
  const blocked = adultsMissing.length > 0 || adultsOnlySansRevenu || entriesMissingDocs.length > 0;
  onValidityChange?.(testMode ? false : blocked);
}, [adultsMissing.length, adultsOnlySansRevenu, entriesMissingDocs.length, onValidityChange, testMode]);

  // Pour le highlight du sélecteur courant
  const currentAdultMissing = adultsMissing.some((a) => a.i === selectedAdultIndex);

  // Info “étudiant”
  const preneur = (members || []).find((m) => m.role === "locataire / preneur");
  const preneurAge = preneur?.dateNaissance ? calcAge(preneur.dateNaissance) : null;
  const isDemandeEtudiante = form.watch("typeDemande") === "Conditions étudiantes";
  const etudiantNonEligible = isDemandeEtudiante && preneurAge !== null && preneurAge >= 25;

  return (
    <div className="space-y-6">
      {/* Titre */}
      <div>
        <h2 className="text-2xl font-semibold">Cochez vos sources de revenu actuel</h2>
        <p className="text-sm text-muted-foreground">
          Saisissez les revenus/ressources par adulte.<br />
          Les justificatifs peuvent être joints plus tard.
        </p>
      </div>

      {/* Sélecteur d’adulte */}
      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
        <div className="sm:col-span-1">
          <Label>Personne (adulte)</Label>
          <Select
            value={selectedAdultIndex !== null ? String(selectedAdultIndex) : ""}
            onValueChange={(val) => setSelectedAdultIndex(parseInt(val, 10))}
          >
            <SelectTrigger className={showBlocking && currentAdultMissing ? "ring-1 ring-destructive" : ""}>
              <SelectValue placeholder="Choisir une personne" />
            </SelectTrigger>
            <SelectContent>
              {adults.map(({ m, i }) => (
                <SelectItem key={i} value={String(i)}>
                  {displayName(m)} — {calcAge(m.dateNaissance)} ans
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Groupes de sources */}
      {selectedAdultIndex === null ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Ajoute au moins un adulte (étape 2) pour pouvoir saisir les finances.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-6">
          {GROUPS.map((g) => (
            <Card key={g.title}>
              <CardHeader>
                <CardTitle className="text-base">{g.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* cases cochables */}
                <div className="flex flex-wrap gap-2">
                  {g.items.map((src) => {
                    const checked = isSourceChecked(selectedAdultIndex, src);
                    return (
                      <Button
                        key={src}
                        type="button"
                        variant={checked ? "default" : "outline"}
                        onClick={() => toggleSource(selectedAdultIndex, src, !checked)}
                      >
                        {SOURCE_LABEL[src]}
                      </Button>
                    );
                  })}
                </div>

                {/* sections détaillées par source cochée (toujours visibles) */}
                <div className="space-y-3">
                  {g.items
                    .filter((src) => isSourceChecked(selectedAdultIndex, src))
                    .map((src) => {
                      const entry = (finances || []).find(
                        (e: any) => e.memberIndex === selectedAdultIndex && e.source === src
                      );
                      return (
                        <IncomeSection
                          key={src}
                          entry={entry}
                          viaFlagWork={viaFlagWork}
                          onChange={(patch) =>
                            upsertEntry({ ...entry, ...patch, memberIndex: selectedAdultIndex, source: src })
                          }
                          onRemove={() => removeEntry(selectedAdultIndex, src)}
                        />
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Alertes / blocages globaux */}
      <div className="space-y-3">
        {showBlocking && adultsMissing.length > 0 && (
          <Alert variant="destructive" role="alert" aria-live="polite">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-2">Sélectionnez au moins une source de revenu pour :</div>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                {adultsMissing.map((a) => (
                  <li key={a.i}>{a.name}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {adultsOnlySansRevenu && (
          <Alert variant="destructive" role="alert" aria-live="polite">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Refus bloquant : tous les adultes sont déclarés <strong>sans revenu</strong>.
            </AlertDescription>
          </Alert>
        )}

        {isDemandeEtudiante && etudiantNonEligible && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-4 text-sm text-yellow-800 space-y-1">
              <div className="font-medium">Parcours "jeunes/étudiant" désactivé</div>
              <ul className="list-disc pl-5">
                {preneurAge !== null && preneurAge >= 25 && <li>Âge du preneur ≥ 25 ans.</li>}
                <li>
                  Si ce n’est pas une première formation à Lausanne/Région, motif supplémentaire requis.
                </li>
              </ul>
            </CardContent>
          </Card>
        )}
        {showBlocking && entriesMissingDocs.length > 0 && (
  <Alert variant="destructive" role="alert" aria-live="polite">
    <AlertCircle className="h-4 w-4" />
    <AlertDescription>
      <div className="font-medium mb-2">
        Pour chaque source sélectionnée, joignez un PDF ou cochez <em>Joindre plus tard</em> :
      </div>
      <ul className="list-disc pl-5 space-y-1 text-sm">
        {entriesMissingDocs.map((x, idx) => (
          <li key={`${x.memberIndex}-${x.source}-${idx}`}>
            {x.name} — {x.sourceLabel}
            {x.required?.length ? (
              <> · <span className="text-muted-foreground">{x.required.join(" · ")}</span></>
            ) : null}
          </li>
        ))}
      </ul>
    </AlertDescription>
  </Alert>
)}

      </div>
    </div>
  );
}

// ================== Section source (toujours ouverte)
function IncomeSection({
  entry,
  onChange,
  onRemove,
  viaFlagWork,
}: {
  entry: any;
  onChange: (patch: any) => void;
  onRemove: () => void;
  viaFlagWork: boolean;
}) {
  const piecesOk =
    entry?.pieces?.later === true ||
    (entry?.pieces?.files?.length || 0) > 0 ||
    (entry?.employeurs || []).some((e: any) => (e?.justificatifs?.length || 0) > 0);

  const laterSwitchId = `later-${entry?.source}-${entry?.memberIndex}`;

  const header = (
    <div className="flex items-start gap-3 w-full">
      <Badge variant="secondary">{SOURCE_LABEL[entry.source as FinanceSource]}</Badge>
      <div className="flex-1 text-sm">
        <div className="text-muted-foreground">
          {piecesOk ? "Justificatifs: OK / Plus tard" : "Justificatifs manquants"}
        </div>
      </div>
      <Button type="button" variant="ghost" size="icon" onClick={onRemove} aria-label="Supprimer">
        <Minus className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <Card className={piecesOk ? "" : "border-yellow-300"}>
      <CardHeader>
        <CardTitle className="text-sm">{header}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Spécifiques par source */}
        <SourceSpecificFields entry={entry} onChange={onChange} viaFlagWork={viaFlagWork} />

        {/* Justificatifs communs */}
        <PiecesBlock
          label="Justificatifs (PDFs multiples) ou joindre plus tard"
          files={entry?.pieces?.files || []}
          later={!!entry?.pieces?.later}
          onChange={(files, later) => onChange({ pieces: { files, later } })}
          inputId={laterSwitchId}
        />
      </CardContent>
    </Card>
  );
}

// ======= Champs spécifiques selon la source
function SourceSpecificFields({
  entry,
  onChange,
  viaFlagWork,
}: {
  entry: any;
  onChange: (p: any) => void;
  viaFlagWork: boolean;
}) {
  const s: FinanceSource = entry?.source;

  // Travail — Salarié
  if (s === "salarie") {
    return (
      <div className="space-y-4">
        <SectionNote
          items={[
            "Contrat de travail",
            "6 dernières fiches de salaire",
            ...(viaFlagWork ? ["Certificats de salaire des 3 dernières années"] : []),
          ]}
        />

        <div className="grid gap-2 md:grid-cols-3">
          <div className="flex items-center gap-2 mt-6">
            <Switch
              id="autres-emp"
              checked={!!entry?.autresEmployeurs}
              onCheckedChange={(v) =>
                onChange({
                  autresEmployeurs: v,
                  employeurs: v ? entry?.employeurs || [{ nom: "" }] : [],
                })
              }
            />
            <Label htmlFor="autres-emp">Autres employeurs ?</Label>
          </div>
        </div>

        {entry?.autresEmployeurs && (
          <EmployeursArray value={entry?.employeurs || []} onChange={(arr) => onChange({ employeurs: arr })} />
        )}
      </div>
    );
  }

  // Travail — Indépendant
  if (s === "independant") {
    const items = viaFlagWork
      ? ["Bilan fiduciaire des 3 dernières années", "Bail commercial"]
      : ["Bilan fiduciaire", "Si activité < 1 an : décision de cotisations AVS provisoire"];

    return (
      <div className="space-y-4">
        <SectionNote items={items} />
        <div className="grid gap-2 md:grid-cols-3">
          <div>
            <Label>Date de début d’activité</Label>
            <Input
              type="date"
              max={todayISO()}
              value={entry?.dateDebutActivite || ""}
              onChange={(e) => onChange({ dateDebutActivite: e.target.value })}
            />
          </div>
        </div>
      </div>
    );
  }

  // AI
  if (s === "ai") {
    return (
      <div className="space-y-2">
        <SectionNote items={["Décision AI récente", "Si > 1 an : attestation fiscale récente"]} />
        <div className="md:w-60">
          <Label>Degré d’invalidité (%)</Label>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={100}
            step={1}
            value={entry?.degreInvaliditeAI ?? 50}
            onChange={(e) => onChange({ degreInvaliditeAI: clampInt(e.target.value, 1, 100) })}
          />
        </div>
      </div>
    );
  }

  // AVS
  if (s === "avs") return <SectionNote items={["Décision AVS récente", "Si > 1 an : attestation fiscale récente"]} />;

  // 2e pilier (LPP)
  if (s === "pilier2") return <SectionNote items={["Attestation fiscale de la rente LPP"]} />;

  // Rente-pont
  if (s === "rente_pont") return <SectionNote items={["Décision de rente-pont"]} />;

  // Chômage
  if (s === "chomage") return <SectionNote items={["Dernier décompte de chômage"]} />;

  // PC famille / PC / RI / EVAM / Bourse
  if (s === "pcfamille") return <SectionNote items={["Décision récente de PC Famille"]} />;
  if (s === "pc") return <SectionNote items={["Décision récente de Prestation Complémentaire (PC)"]} />;
  if (s === "ri") return <SectionNote items={["3 derniers budgets mensuels (RI)"]} />;
  if (s === "evam") return <SectionNote items={["3 derniers budgets mensuels (EVAM)"]} />;
  if (s === "bourse") return <SectionNote items={["Avis d’octroi de bourse d’études"]} />;

  // Pension alimentaire
  if (s === "pension") {
    return (
      <div className="grid gap-2 md:grid-cols-3">
        <div>
          <Label>Reçu ou Versé</Label>
          <Select value={entry?.pensionRecuOuVerse || ""} onValueChange={(v) => onChange({ pensionRecuOuVerse: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="reçu">Reçu</SelectItem>
              <SelectItem value="versé">Versé</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <SectionNote items={["Convention ratifiée (justificatif)"]} compact />
        </div>
      </div>
    );
  }

  // Formation
  if (s === "formation") {
    return (
      <div className="space-y-2">
        <SectionNote
          items={[
            "En formation : Attestation d’études",
            "Formation rémunérée : Attestation d’études + justificatif du revenu (contrat, fiche de salaire ou décision d’allocation)",
          ]}
        />
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <Switch
              id="form-en-cours"
              checked={!!entry?.formationEnCours}
              onCheckedChange={(v) => onChange({ formationEnCours: v })}
            />
            <Label htmlFor="form-en-cours">En formation</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="form-remu"
              checked={!!entry?.formationRemuneree}
              onCheckedChange={(v) => onChange({ formationRemuneree: v })}
            />
            <Label htmlFor="form-remu">Formation rémunérée</Label>
          </div>
        </div>
      </div>
    );
  }

  // Apprentissage / Job
  if (s === "apprentissage") return <SectionNote items={["Contrat + dernière fiche de salaire"]} />;

  // Autres / Sans revenu
  if (s === "autres") return <SectionNote items={["Joindre tout justificatif pertinent (APG militaire : dernier décompte ou décision)"]} />;

  if (s === "sans_revenu") {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Déclaré <strong>sans revenu</strong> pour cette personne. Si cela s’applique à tous les adultes, la demande sera refusée (bloquant).
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}

// ====== Bloc « employeurs multiples »
function EmployeursArray({
  value,
  onChange,
}: {
  value: { nom: string; justificatifs?: File[] }[];
  onChange: (arr: { nom: string; justificatifs?: File[] }[]) => void;
}) {
  const add = () => onChange([...(value || []), { nom: "" }]);
  const update = (i: number, patch: any) => {
    const arr = [...(value || [])];
    arr[i] = { ...(arr[i] || {}), ...patch };
    onChange(arr);
  };
  const remove = (i: number) => {
    const arr = [...(value || [])];
    arr.splice(i, 1);
    onChange(arr);
  };

  return (
    <div className="space-y-3">
      {(value || []).map((emp, i) => (
        <Card key={i}>
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Employeur #{i + 1}</span>
              <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)}>
                <Minus className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <Label>Nom de l’employeur</Label>
              <Input
                value={emp?.nom || ""}
                onChange={(e) => update(i, { nom: e.target.value })}
                placeholder="Raison sociale"
              />
            </div>
            <div>
              <Label>Justificatifs (PDFs)</Label>
              <FileUpload
                accept="application/pdf"
                multiple
                value={emp?.justificatifs || []}
                onChange={(files) => update(i, { justificatifs: files })}
              />
            </div>
          </CardContent>
        </Card>
      ))}
      <Button type="button" variant="outline" onClick={add}>
        <Plus className="h-4 w-4 mr-2" /> Ajouter un employeur
      </Button>
    </div>
  );
}

// ====== Bloc générique pièces (uploads multiples + later)
function PiecesBlock({
  label,
  files,
  later,
  onChange,
  inputId,
}: {
  label: string;
  files: File[];
  later: boolean;
  onChange: (files: File[], later: boolean) => void;
  inputId: string;
}) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium flex items-center gap-2">
        <FileText className="h-4 w-4" /> {label}
      </div>
      <div className="grid gap-2 md:grid-cols-3 items-end">
        <div className="md:col-span-2">
          <FileUpload accept="application/pdf" multiple value={files} onChange={(fs) => onChange(fs, later)} />
        </div>
        <div className="flex items-center gap-2">
          <Switch id={inputId} checked={later} onCheckedChange={(v) => onChange(files, v)} />
          <Label htmlFor={inputId}>Joindre plus tard</Label>
        </div>
      </div>
    </div>
  );
}

// ====== Petit composant « liste de pièces attendues »
function SectionNote({ items, compact = false }: { items: string[]; compact?: boolean }) {
  return (
    <Card className={compact ? "border-muted" : ""}>
      <CardContent className={compact ? "p-3" : "p-4"}>
        <ul className="text-sm list-disc pl-5 space-y-1">
          {items.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function clampInt(v: any, min: number, max: number) {
  const x = int(v);
  return Math.min(max, Math.max(min, x));
}

export default Step4Finances;
