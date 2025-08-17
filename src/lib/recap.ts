// src/lib/recap.ts
import { FormData } from "@/types/form";
import { calcAge, isHommeSeul, calculateMaxPieces } from "@/lib/helpers";

// -------------------- Types de sortie
export type MissingDocs = {
  warningDocs: string[];    // Manquants informatifs / pouvant exclure
  joinLater: string[];      // Tous les "Joindre plus tard"
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
    if (exp < today) return false;
  }
  return true;
};

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

// -------------------- 3) Revenu mensuel estimé (incl. 13e si déclaré par source)
export function computeEstimatedMonthlyIncome(data: FormData): number {
  // Hypothèse: data.finances = [{ netMensuel?: number, has13e?: boolean }, ...]
  const items: any[] = (data as any)?.finances ?? [];
  let total = 0;
  for (const f of items) {
    const net = Number(f?.netMensuel ?? 0);
    const has13e = !!f?.has13e;
    const monthly = has13e ? net + net / 12 : net;
    total += monthly;
  }
  return Math.round(total);
}

// -------------------- 4) Documents manquants (aligné Step2)
export function buildMissingDocs(data: FormData): MissingDocs {
  const members: any[] = (data?.members ?? []) as any[];
  const warningDocs: string[] = [];
  const joinLater: string[] = [];

  for (const m of members) {
    const label = [m?.prenom, m?.nom].filter(Boolean).join(" ") || "Membre";

    if (m.role !== 'enfantANaître') {
      // Pièce d'identité (Suisse ET étrangers)
      if (!m?.pieceIdentite) {
        warningDocs.push(`Papiers d’identité manquants — ${label}`);
      }

      // Non-CH → permis + scan + expiration si B/F
      if (m?.nationalite?.iso !== 'CH') {
        if (!['Permis C', 'Permis B', 'Permis F'].includes(m?.permis || '')) {
          warningDocs.push(`Permis non reconnu pour ${label} — membre potentiellement exclu`);
        } else {
          if ((m.permis === 'Permis B' || m.permis === 'Permis F')) {
            if (!m?.permisExpiration) {
              warningDocs.push(`Date d’expiration du ${m.permis} manquante — ${label}`);
            }
          }
          if (!m?.permisScan) {
            warningDocs.push(`Scan du titre de séjour (${m.permis}) manquant — ${label}`);
          }
        }
      }
    }

    // État civil (adultes)
    if (isAdult(m)) {
      if (['Divorcé·e', 'Séparé·e', 'Part. dissous'].includes(m?.etatCivil)) {
        if (m?.justificatifEtatCivilLater) {
          joinLater.push(`Justificatif état civil — ${label}`);
        } else if (!m?.justificatifEtatCivil) {
          warningDocs.push(`Justificatif d’état civil (PDF) manquant — ${label}`);
        }
      }
      if (m?.etatCivil === 'Marié·e') {
        // cas "personne seule" = 1 seul titulaire/co-titulaire
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

  // Règle “homme seul + enfant(s)” → convention/jugement requis pour chaque enfant
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

  return { warningDocs, joinLater };
}

// -------------------- 5) Validations critiques (refus bloquants)
export function runCriticalValidations(data: FormData): CriticalResult {
  const refus: string[] = [];
  const fieldErrors: string[] = [];

  const members: any[] = (data?.members ?? []) as any[];
  const preneur: any = members.find((m: any) => m?.role === 'locataire / preneur');

  if (preneur) {
    // Preneur mineur → refus (sauf si tu gères un doc d’émancipation ailleurs)
    if (preneur?.dateNaissance && calcAge(preneur.dateNaissance) < 18) {
      refus.push("Preneur·euse < 18 ans (émancipation requise).");
    }
    // Permis preneur invalide/expiré → refus
    if (!isPermitValidForMember(preneur)) {
      refus.push("Permis du/de la preneur·euse invalide ou expiré.");
    }
  }

  // Tous les adultes (validés) sans revenu déclaré → refus
  // Hypothèse simple: chaque finance item correspond à un adulte; ajuste selon ton schéma si besoin.
  const adults = members.filter((m) => isAdult(m) && isPermitValidForMember(m));
  const hasAnyIncome =
    Array.isArray((data as any)?.finances) &&
    (data as any).finances.some((f: any) => Number(f?.netMensuel || 0) > 0);
  if (adults.length > 0 && !hasAnyIncome) {
    refus.push("Tous les adultes sont sans revenu déclaré.");
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
