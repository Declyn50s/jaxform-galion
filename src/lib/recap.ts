// src/lib/recap.ts
import { FormData } from "@/types/form";
import { calcAge } from '@/lib/helpers';
import { calculateMaxPieces } from '@/lib/helpers';

// -------------------- Types de sortie
export type MissingDocs = {
  blockingDocs: string[];   // Manquants bloquants
  warningDocs: string[];    // Manquants informatifs / pouvant exclure qqch
  joinLater: string[];      // Tous les "Joindre plus tard"
};

export type CriticalResult = {
  refus: string[];          // Refus bloquants
  fieldErrors: string[];    // Erreurs de champ (ex: AI degree hors 1..100)
};

export type HouseholdSummary = {
  typeDemande?: string;
  nbAdults: number;
  nbChildren: number;
  nbExcludedChildren: number; // mineurs non comptés (p. ex. sans convention)
  nbExcludedByPermit: number; // membres exclus (permis invalide)
  piecesDeclarees?: number | string;
  piecesMaxRegle: number | string; // après barème/plafonds
};

export type TaxationRequirement = "required" | "optional" | "none";

// -------------------- Utilitaires génériques
const isMinor = (birthDate?: string) => {
  if (!birthDate) return false;
  const b = new Date(birthDate);
  const now = new Date();
  const age = now.getFullYear() - b.getFullYear() - ((now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) ? 1 : 0);
  return age < 18;
};

const validPermit = (permit?: { type?: string; validTo?: string }) => {
  if (!permit?.type) return false;
  if (!permit?.validTo) return true; // si pas de date, on considère valide par défaut
  return new Date(permit.validTo) >= new Date();
};

// -------------------- 1) Récap ménage + application des règles "pièces"
export function computeHouseholdSummary(data: any) {
  const members = data?.members || [];

  const isAdult = (m: any) =>
    m.dateNaissance ? calcAge(m.dateNaissance) >= 18
    : (m.role === 'locataire / preneur' || m.role === 'co-titulaire');

  const isChild = (m: any) =>
    m.role === 'enfantANaître' || (m.dateNaissance && calcAge(m.dateNaissance) < 18);

  // Exclusions permis (non-CH sans permis valide / expiré)
  const excludedByPermit = members.filter((m: any) => {
    const isSwiss = m?.nationalite?.iso === 'CH';
    if (isSwiss) return false;
    const valid = ['Permis C','Permis B','Permis F'].includes(m?.permis || '');
    if (!valid) return true;
    if (['Permis B','Permis F'].includes(m.permis)) {
      if (!m.permisExpiration) return true;
      const exp = new Date(m.permisExpiration);
      const today = new Date(); exp.setHours(0,0,0,0); today.setHours(0,0,0,0);
      if (exp < today) return true;
    }
    return false;
  }).length;

  const nbAdults = members.filter(isAdult).length;
  const nbChildren = members.filter((m:any) =>
    isChild(m) && (m.role !== 'enfantANaître' || !!m.certificatGrossesse)
  ).length;

  const nbExcludedChildren = members.filter((m:any) =>
    m.role === 'enfantANaître' && !m.certificatGrossesse
  ).length;

  return {
    typeDemande: data?.typeDemande ?? null,
    nbAdults,
    nbChildren,
    nbExcludedChildren,
    nbExcludedByPermit: excludedByPermit,
    piecesDeclarees: data?.logement?.pieces ?? null,
    piecesMaxRegle: calculateMaxPieces(members),
  };
}

// -------------------- 2) Taxation matrix
export function computeTaxationRequirement(data: FormData): TaxationRequirement {
  // Hypothèses:
  // - nationality: "CH" pour suisse, sinon ISO
  // - permit.type: "B" | "C" | "F" | ...
  // - address: { canton?: "VD" | "...", commune?: string }
  const preneur: any = (data?.members ?? []).find((m: any) => m?.role === "preneur");
  const permitType = preneur?.permit?.type;
  const nationality = preneur?.nationality; // "CH" si suisse
  const canton = preneur?.address?.canton || data?.logement?.canton; // adapte
  const commune = (preneur?.address?.commune || data?.logement?.commune || "").toLowerCase();

  if (permitType === "B" || permitType === "F") return "none"; // jamais demander
  if (nationality !== "CH" && permitType !== "C") return "none";

  // Suisse / Permis C :
  if (canton && canton !== "VD") return "required";
  if (canton === "VD") {
    if (commune === "lausanne") return "none";
    return "optional";
  }
  // défaut
  return "optional";
}

// -------------------- 3) Revenu mensuel estimé (incl. 13e)
export function computeEstimatedMonthlyIncome(data: FormData): number {
  // data.finances: [{ netMensuel?: number, has13e?: boolean }, ...]
  const items: any[] = data?.finances ?? [];
  let total = 0;
  for (const f of items) {
    const net = Number(f?.netMensuel ?? 0);
    const has13e = !!f?.has13e;
    const monthly = has13e ? net + net / 12 : net;
    total += monthly;
  }
  return Math.round(total);
}

// -------------------- 4) Documents manquants
export function buildMissingDocs(data: FormData): MissingDocs {
  // Hypothèse: data.uploads = { [key: string]: { status: "ok"|"later"|"missing" } }
  const uploads: Record<string, { status: "ok" | "later" | "missing" }> = (data as any)?.uploads ?? {};
  const blockingDocs: string[] = [];
  const warningDocs: string[] = [];
  const joinLater: string[] = [];

  Object.entries(uploads).forEach(([k, v]) => {
    if (v.status === "later") joinLater.push(k);
    if (v.status === "missing") {
      // exemple simple: tout "missing" est bloquant, ajuste si tu as une liste durs vs soft
      blockingDocs.push(k);
    }
  });

  // Règle: "preneur masculin seul + enfants mineurs → avertissement convention alimentaire"
  const members: any[] = (data?.members ?? []) as any[];
  const preneur = members.find(m => m?.role === "preneur");
  const preneurMaleAlone = preneur?.gender === "M" && !members.some(m => m?.role === "conjoint");
  const hasMinor = members.some(m => isMinor(m?.birthDate));
  if (preneurMaleAlone && hasMinor) {
    // Si un enfant sans convention => warning (et déjà exclu du calcul)
    const missingConv = members.some(m => isMinor(m?.birthDate) && !m?.hasAlimonyConvention);
    if (missingConv) warningDocs.push("Convention alimentaire ratifiée (enfants mineurs)");
  }

  return { blockingDocs, warningDocs, joinLater };
}

// -------------------- 5) Validations critiques
export function runCriticalValidations(data: FormData): CriticalResult {
  const refus: string[] = [];
  const fieldErrors: string[] = [];

  const members: any[] = data?.members ?? [];
  const preneur: any = members.find(m => m?.role === "preneur");

  // Preneur <18 ans sans émancipation PDF → refus
  if (preneur) {
    const minor = isMinor(preneur?.birthDate);
    const emancipatedPdf = !!(preneur?.emancipationPdfUploaded);
    if (minor && !emancipatedPdf) {
      refus.push("Preneur·euse < 18 ans sans document d’émancipation.");
    }

    // Permis preneur invalide → refus
    if (!validPermit(preneur?.permit)) {
      refus.push("Permis du preneur·euse invalide.");
    }
  }

  // AI degree: champ obligatoire 1–100 (entier) ; validation de champ uniquement
  const aiDegree = preneur?.aiDegree;
  if (aiDegree === undefined || aiDegree === null || !Number.isInteger(aiDegree) || aiDegree < 1 || aiDegree > 100) {
    fieldErrors.push("Degré AI du preneur·euse doit être un entier entre 1 et 100.");
  }

  // Tous adultes “Sans revenu” → refus
  const adults = members.filter(m => !isMinor(m?.birthDate) && validPermit(m?.permit));
  const allAdultsNoIncome = adults.length > 0 && adults.every(a => !!a?.noIncome === true);
  if (allAdultsNoIncome) refus.push("Tous les adultes sont sans revenu déclaré.");

  return { refus, fieldErrors };
}

// -------------------- 6) Suggestions auto si refus
export function buildRefusalSuggestions(): Array<{title: string; href: string; desc: string}> {
  return [
    {
      title: "LLA — Logements à Loyer Abordable",
      href: "https://www.lausanne.ch/lla",
      desc: "Logements à loyers modérés hors dispositif LLM."
    },
    {
      title: "LE — Logements Étudiants",
      href: "https://www.lausanne.ch/logements-etudiants",
      desc: "Offre dédiée aux étudiant·e·s."
    },
    {
      title: "LS — Logements Séniors",
      href: "https://www.lausanne.ch/logements-seniors",
      desc: "Solutions adaptées dès 60 ans."
    },
    {
      title: "Logements à loyer libre (Ville de Lausanne)",
      href: "https://www.lausanne.ch/loyer-libre",
      desc: "Annonces hors critères LLM."
    }
  ];
}

// -------------------- 7) Référence & accusé
export function generateReference(): { ref: string; at: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const ref = `LLM-${y}${m}${d}-${hh}${mm}${ss}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const at = `${d}.${m}.${y} ${hh}:${mm}`;
  return { ref, at };
}
