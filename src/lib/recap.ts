// src/lib/recap.ts
import { FormData } from "@/types/form";
import { calcAge, isHommeSeul, calculateMaxPieces } from "@/lib/helpers";

// -------------------- Types de sortie
export type MissingDocs = {
  warningDocs: string[];    // Manquants informatifs / pouvant exclure (hors permis)
  joinLater: string[];      // Tous les "Joindre plus tard"
  blockingDocs: string[];   // Manquants bloquants (si tu veux en distinguer)
  // Bloc "Information — titres de séjour"
  permitNotice?: { notice: string; lines: string[] } | null;
};

export type CriticalResult = {
  refus: string[];          // Refus bloquants
  fieldErrors: string[];    // Erreurs de champ si besoin
};

export type HouseholdSummary = {
  typeDemande?: string | null;
  nbAdults: number;
  nbChildren: number;
  nbExcludedChildren: number; // mineurs non comptés (p. ex. enfant à naître sans certificat)
  nbExcludedByPermit: number; // membres exclus (permis invalide/expiré)
  piecesDeclarees?: number | string | null;
  piecesMaxRegle: number | string; // après barème/plafonds
};

export type TaxationRequirement = "required" | "optional" | "none";

// -------------------- Utils locaux
const isAdult = (m: any) =>
  m?.dateNaissance ? calcAge(m.dateNaissance) >= 18
  : (m?.role === 'locataire / preneur' || m?.role === 'co-titulaire');

const isChild = (m: any) =>
  m?.role === 'enfantANaître' || (m?.dateNaissance && calcAge(m.dateNaissance) < 18);

const isPermitValidForMember = (m: any): boolean => {
  const isSwiss = m?.nationalite?.iso === 'CH';
  if (isSwiss) return true;
  const validPermits = ['Permis C', 'Permis B', 'Permis F'];
  if (!validPermits.includes(m?.permis || '')) return false;
  if (m.permis === 'Permis B' || m.permis === 'Permis F') {
    if (!m?.permisExpiration) return false;
    const exp = new Date(m.permisExpiration);
    const today = new Date();
    exp.setHours(0,0,0,0); today.setHours(0,0,0,0);
    if (Number.isNaN(exp.getTime())) return false;
    if (exp < today) return false;
  }
  return true;
};

const isValidIsoDate = (s?: string) => !!s && !Number.isNaN(new Date(s).getTime());

// -------------------- 1) Récap ménage + application des règles "pièces"
export function computeHouseholdSummary(data: any): HouseholdSummary {
  const members: any[] = data?.members || [];

  const nbExcludedByPermit = members.filter((m) => !isPermitValidForMember(m)).length;

  const nbAdults = members.filter(isAdult).length;

  const nbChildren = members.filter((m) =>
    isChild(m) && (m.role !== 'enfantANaître' || !!m.certificatGrossesse)
  ).length;

  const nbExcludedChildren = members.filter(
    (m) => m.role === 'enfantANaître' && !m.certificatGrossesse
  ).length;

  return {
    typeDemande: data?.typeDemande ?? null,
    nbAdults,
    nbChildren,
    nbExcludedChildren,
    nbExcludedByPermit,
    piecesDeclarees: data?.logement?.pieces ?? null,
    piecesMaxRegle: calculateMaxPieces(members),
  };
}

// -------------------- 2) Exigence de taxation (canton/commune + nationalité/permis)
export function computeTaxationRequirement(data: any): TaxationRequirement {
  const preneur: any = (data?.members ?? []).find((m: any) => m?.role === 'locataire / preneur');
  const permitType: string | undefined = preneur?.permis;              // "Permis C/B/F"
  const nationalityIso: string | undefined = preneur?.nationalite?.iso; // "CH" si Suisse
  const canton: string | undefined = preneur?.adresse?.canton || data?.logement?.canton || "";
  const commune = (preneur?.adresse?.commune || data?.logement?.commune || "").toLowerCase();

  // B/F → jamais demander
  if (permitType === "Permis B" || permitType === "Permis F") return "none";

  // Non-CH sans C → ne pas demander
  if (nationalityIso !== "CH" && permitType !== "Permis C") return "none";

  // Suisse ou C :
  if (canton && canton !== "VD") return "required";
  if (canton === "VD") return commune === "lausanne" ? "none" : "optional";

  return "optional";
}

// -------------------- 3) Revenu mensuel estimé (ancien modèle avec montants)
/** @deprecated Plus de montants saisis ; renvoie 0. Préférer computeIncomeDeclarationStatus. */
export function computeEstimatedMonthlyIncome(_data: FormData): number {
  return 0;
}

/** Statut de déclaration de revenus par adulte (sans montants). */
export function computeIncomeDeclarationStatus(data: FormData): {
  totalAdults: number;
  adultsWithAnySource: number;
  adultsOnlySansRevenu: number;
} {
  const members: any[] = (data as any)?.members ?? [];
  const finances: any[] = (data as any)?.finances ?? [];

  const adults = members
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => isAdult(m) && isPermitValidForMember(m));

  const setByIdx = new Map<number, Set<string>>();
  for (const f of finances) {
    const idx = Number.isInteger(f?.memberIndex) ? (f.memberIndex as number) : null;
    const src = typeof f?.source === "string" ? (f.source as string) : null;
    if (idx === null || !src) continue;
    const s = setByIdx.get(idx) ?? new Set<string>();
    s.add(src);
    setByIdx.set(idx, s);
  }

  let adultsWithAnySource = 0;
  let adultsOnlySansRevenu = 0;
  for (const { i } of adults) {
    const s = setByIdx.get(i);
    if (s && s.size > 0) {
      adultsWithAnySource++;
      if ([...s].every((x) => x === "sans_revenu")) adultsOnlySansRevenu++;
    }
  }

  return {
    totalAdults: adults.length,
    adultsWithAnySource,
    adultsOnlySansRevenu,
  };
}

// -------------------- 4) Documents manquants (avec bloc "Information — titres de séjour")
export function buildMissingDocs(data: FormData): MissingDocs {
  const members: any[] = (data?.members ?? []) as any[];
  const warningDocs: string[] = [];
  const joinLater: string[] = [];
  const blockingDocs: string[] = []; // on laisse vide par défaut

  // Bloc Information — titres de séjour
  const permitNoticeLines: string[] = [];
  let hasPermitPolicyRisk = false;

  const MS_IN_DAY = 24 * 60 * 60 * 1000;
  const DAYS_THRESHOLD = 60; // ~2 mois
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const m of members) {
    const label = [m?.prenom, m?.nom].filter(Boolean).join(" ") || "Membre";

    // Papiers d'identité pour tous (hors enfant à naître)
    if (m.role !== 'enfantANaître') {
      if (!m?.pieceIdentite) {
        warningDocs.push(`Papiers d’identité manquants — ${label}`);
      }
    }

    // Politique permis : uniquement non-CH
    const isSwiss = m?.nationalite?.iso === "CH";
    if (!isSwiss) {
      const permis = m?.permis || "";
      const known = ["Permis C", "Permis B", "Permis F"].includes(permis);

      if (!known) {
        // type non reconnu ⇒ information
        hasPermitPolicyRisk = true;
        permitNoticeLines.push(`${label} — type de permis non reconnu.`);
      } else {
        // scan recommandé pour information générale
        if (!m?.permisScan) {
          warningDocs.push(`Scan du titre de séjour (${permis}) manquant — ${label}`);
        }

        // B/F : expiration requise → applique la politique < 2 mois
        if (permis === "Permis B" || permis === "Permis F") {
          const expStr = m?.permisExpiration;
          const exp = expStr ? new Date(expStr) : null;

          if (!exp || Number.isNaN(exp.getTime())) {
            hasPermitPolicyRisk = true;
            permitNoticeLines.push(`${label} — ${permis}: date d’expiration manquante ou invalide.`);
          } else {
            exp.setHours(0, 0, 0, 0);
            const deltaDays = Math.round((exp.getTime() - today.getTime()) / MS_IN_DAY);
            if (exp < today) {
              hasPermitPolicyRisk = true;
              permitNoticeLines.push(`${label} — ${permis} expiré le ${exp.toLocaleDateString()}.`);
            } else if (deltaDays < DAYS_THRESHOLD) {
              hasPermitPolicyRisk = true;
              permitNoticeLines.push(`${label} — ${permis} arrive à échéance dans ${deltaDays} jour(s) (${exp.toLocaleDateString()}).`);
            }
          }
        }
      }
    }

    // Adultes — état civil
    if (isAdult(m)) {
      if (['Divorcé·e', 'Séparé·e', 'Part. dissous'].includes(m?.etatCivil)) {
        if (m?.justificatifEtatCivilLater) {
          joinLater.push(`Justificatif état civil — ${label}`);
        } else if (!m?.justificatifEtatCivil) {
          warningDocs.push(`Justificatif d’état civil (PDF) manquant — ${label}`);
        }
      }
      if (m?.etatCivil === 'Marié·e') {
        const titulaires = members.filter((x: any) =>
          ['locataire / preneur', 'co-titulaire'].includes(x.role)
        );
        if (titulaires.length === 1) {
          if (!m?.lieuConjoint) {
            warningDocs.push(`Lieu du conjoint manquant — ${label}`);
          }
          if (!m?.justificatifMariage) {
            warningDocs.push(`Certificat de mariage ou explication (PDF) manquant — ${label}`);
          }
        }
      }
    }

    // Enfant à naître
    if (m?.role === 'enfantANaître') {
      if (!m?.datePrevueAccouchement) {
        warningDocs.push(`DPA manquante — Enfant à naître`);
      }
      if (!m?.certificatGrossesse) {
        warningDocs.push(`Certificat de grossesse (≥ 13e semaine) manquant — Enfant à naître (non comptabilisé)`);
      }
    }
  }

  const permitNotice = hasPermitPolicyRisk
    ? {
        notice:
`Pas de dossier accepté si le permis expire dans moins de 2 mois.
Seules les personnes avec un permis valable plus de 2 mois peuvent déposer une demande.

Exemple simple :
Personne 1 a un permis valable → son dossier est traité, logement max. 2,5 pièces.
Personne 2 n’a pas de permis valable → elle n’est pas prise en compte.
Quand Personne 2 aura un permis renouvelé → le couple pourra demander un logement 3,5 pièces.
⚠️ Une attestation de renouvellement n’est pas valable.`,
        lines: permitNoticeLines,
      }
    : null;

  // Règle “homme seul + enfant(s)” → conventions/jugements
  if (isHommeSeul(members)) {
    for (const m of members) {
      if (m?.role === 'enfant') {
        const nom = [m?.prenom, m?.nom].filter(Boolean).join(" ") || 'Enfant';
        if (!m?.justificatifParental) {
          warningDocs.push(`Convention alimentaire / jugement ratifié manquant — ${nom} (enfant non compté)`);
        }
        if (!m?.situationEnfant) {
          warningDocs.push(`Préciser la situation de l’enfant (garde partagée / droit de visite) — ${nom}`);
        }
      }
    }
  }

  return { warningDocs, joinLater, blockingDocs, permitNotice };
}

// -------------------- 5) Validations critiques (refus bloquants)
export function runCriticalValidations(data: FormData): CriticalResult {
  const refus: string[] = [];
  const fieldErrors: string[] = [];

  const members: any[] = (data?.members ?? []) as any[];
  const preneur: any = members.find((m: any) => m?.role === "locataire / preneur");

  if (preneur) {
    // Preneur mineur → refus (sauf émancipation gérée ailleurs)
    if (preneur?.dateNaissance && calcAge(preneur.dateNaissance) < 18) {
      refus.push("Preneur·euse < 18 ans (émancipation requise).");
    }
    // Permis preneur invalide/expiré → refus
    if (!isPermitValidForMember(preneur)) {
      refus.push("Permis du/de la preneur·euse invalide ou expiré.");
    }
  }

  // === Règles finances : basées UNIQUEMENT sur les sources, pas sur des montants ===
  const adults = members
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => isAdult(m) && isPermitValidForMember(m));

  // Map<memberIndex, Set<sources>>
  const finances: any[] = Array.isArray((data as any)?.finances) ? (data as any).finances : [];
  const sourcesByAdult = new Map<number, Set<string>>();
  for (const f of finances) {
    const idx = Number.isInteger(f?.memberIndex) ? (f.memberIndex as number) : null;
    const src = typeof f?.source === "string" ? (f.source as string) : null;
    if (idx === null || !src) continue;
    const set = sourcesByAdult.get(idx) ?? new Set<string>();
    set.add(src);
    sourcesByAdult.set(idx, set);
  }

  if (adults.length > 0) {
    // 1) Aucune source renseignée pour tous les adultes → refus
    const everyAdultMissingSource = adults.every(({ i }) => (sourcesByAdult.get(i)?.size ?? 0) === 0);
    if (everyAdultMissingSource) {
      refus.push("Aucune source de revenu renseignée pour les adultes.");
    }

    // 2) Tous les adultes uniquement "sans_revenu" → refus
    const allSansRevenu = adults.every(({ i }) => {
      const set = sourcesByAdult.get(i);
      return set && set.size > 0 && [...set].every((s) => s === "sans_revenu");
    });
    if (allSansRevenu) {
      refus.push("Tous les adultes sont déclarés sans revenu.");
    }
  }

  return { refus, fieldErrors };
}

// -------------------- 6) Suggestions auto si refus
export function buildRefusalSuggestions(): Array<{title: string; href: string; desc: string}> {
  return [
    {
      title: "LLA — Logements à Loyer Abordable",
      href: "https://www.lausanne.ch/vie-pratique/logement/logements-disponibles/logements-loyer-abordable-disponibles.html",
      desc: "Logements à loyers modérés hors dispositif LLM."
    },
    {
      title: "LE — Logements Étudiants",
      href: "https://www.lausanne.ch/vie-pratique/logement/logements-utilite-publique/logements-etudiants-le.html",
      desc: "Offre dédiée aux étudiant·e·s."
    },
    {
      title: "LS — Logements Séniors",
      href: "https://www.lausanne.ch/vie-pratique/logement/logements-utilite-publique/logements-seniors.html",
      desc: "Solutions adaptées dès 60 ans."
    },
    {
      title: "Logements à loyer libre (Ville de Lausanne)",
      href: "https://www.lausanne.ch/vie-pratique/logement/logements-disponibles.html",
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
