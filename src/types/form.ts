import { z } from "zod";

/* ===================== Constantes / Enums ===================== */

export const COREL_COMMUNES = [
  "Belmont", "Froideville", "Prilly", "Bretigny", "Jouxtens-Mézery", "Pully",
  "Bussigny", "Lausanne", "Renens", "Chavannes", "Lutry", "Romanel",
  "Cheseaux", "Mézières", "St-Sulpice", "Crissier", "Le Mont", "Savigny",
  "Cugy", "Montpreveyres", "Villars-St-Croix", "Ecublens", "Morrens",
  "Villars-Tiercelin", "Epalinges", "Préverenges",
] as const;

export const INCOME_SOURCES = [
  "salarie", "independant", "pcfamille", "ai", "avs", "pilier2",
  "pc", "ri", "evam", "chomage", "pension", "formation",
  "bourse", "apprentissage", "rente_pont", "autres", "sans_revenu",
] as const;

export type FinanceSource = typeof INCOME_SOURCES[number];

/* ===================== Upload (si tu utilises un modèle d’objets) ===================== */

export const uploadSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: z.number(),
  type: z.string(),
  lastModified: z.number(),
  url: z.string().optional(),
  status: z.enum(["uploading", "success", "error"]).default("uploading"),
});

export type Upload = z.infer<typeof uploadSchema>;

/* ===================== Members ===================== */

export const memberSchema = z.object({
  id: z.string(),
  nom: z.string().min(1, "Le nom est requis"),
  prenom: z.string().min(1, "Le prénom est requis"),
  genre: z.enum(["Homme", "Femme", "Autre"]),
  dateNaissance: z.string().optional(),
  dateAccouchement: z.string().optional(),

  adresse: z.object({
    rue: z.string().min(1, "La rue est requise"),
    numero: z.string().min(1, "Le numéro est requis"),
    npaCommune: z.string().min(1, "NPA et commune sont requis"),
    canton: z.string().min(1, "Le canton est requis"),
    sameAsPrevious: z.boolean().default(false),
  }),

  telephone: z.string().optional(),
  email: z.string().email().optional(),

  nationalite: z.object({
    pays: z.string().min(1, "La nationalité est requise"),
    iso: z.string(),
    emoji: z.string(),
  }),

  // Permis sous forme d'objet (cohérent avec Step5/ton schéma)
  permis: z
    .object({
      type: z.enum(["Permis C", "Permis B", "Permis F", "Sans permis", "Autre"]).optional(),
      dateExpiration: z.string().optional(),
    })
    .optional(),

  // États civils élargis pour coller aux usages de recap.ts
  etatCivil: z
    .enum([
      "Célibataire",
      "Marié·e",
      "Divorcé·e",
      "Veuf·ve",
      "Partenariat",
      "Séparé·e",
      "Part. dissous",
    ])
    .optional(),

  // Ajout de "co-titulaire" (utilisé dans isAdult / recap.ts)
  role: z.enum(["locataire / preneur", "co-titulaire", "enfant", "autre", "enfantANaître"]),

  marriageInfo: z
    .object({
      lieuConjoint: z.string().optional(),
      certificat: z.array(uploadSchema).default([]),
    })
    .optional(),

  grossesseInfo: z
    .object({
      certificat: z.array(uploadSchema).default([]),
    })
    .optional(),
});

export type Member = z.infer<typeof memberSchema>;

/* ===================== Finances — modèle aligné avec Step4 ===================== */

/**
 * Aligné avec Step4:
 * - Une entrée par {memberIndex, source}
 * - pieces: { files[], later }
 * - employeurs[] pour "salarie" (justificatifs facultatifs)
 */

const employeurSchema = z.object({
  nom: z.string().default(""),
  justificatifs: z.array(uploadSchema).default([]),
});

export const financeEntrySchema = z.object({
  memberIndex: z.number(),                        // index du membre dans `members`
  source: z.enum(INCOME_SOURCES),

  // Métadonnées communes
  pieces: z
    .object({
      files: z.array(uploadSchema).default([]),
      later: z.boolean().default(false),
    })
    .default({ files: [], later: false }),

  // Champs spécifiques par source (tous optionnels)
  employeurs: z.array(employeurSchema).default([]),
  autresEmployeurs: z.boolean().optional(),
  travailALausanne: z.boolean().optional(),

  dateDebutActivite: z.string().optional(),       // independant

  degreInvaliditeAI: z.number().min(1).max(100).optional(), // ai

  pensionRecuOuVerse: z.enum(["reçu", "versé"]).optional(), // pension

  formationEnCours: z.boolean().optional(),       // formation
  formationRemuneree: z.boolean().optional(),     // formation

  commentaire: z.string().optional(),
});

export type FinanceEntry = z.infer<typeof financeEntrySchema>;

/* ===================== Snapshot pendingLater (rempli par Step4) ===================== */

export const pendingLaterItemSchema = z.object({
  id: z.string(),               // `${memberIndex}:${source}:pieces`
  memberIndex: z.number(),
  memberName: z.string(),
  source: z.enum(INCOME_SOURCES),
  sourceLabel: z.string(),
  fieldPath: z.string(),        // ex: finances[3].pieces
  label: z.string(),            // ex: "Justificatifs du revenu (bloc principal)"
});

export type PendingLater = z.infer<typeof pendingLaterItemSchema>;

/* ===================== Form principal ===================== */

export const formSchema = z.object({
  // Step 1
  typeDemande: z.enum([
    "Inscription",
    "Contrôle",
    "Renouvellement",
    "Mise à jour",
    "Conditions étudiantes",
  ]),

  // Pré-filtrage (optionnel)
  preFiltering: z
    .object({
      habiteLausanne3Ans: z.boolean().optional(),
      travailleLausanne3Ans: z.boolean().optional(),
      flagViaWork: z.boolean().default(false),
    })
    .optional(),

  // Step 2: Ménage
  members: z.array(memberSchema).min(1, "Au moins un membre est requis"),

  // Step 3: Logement
  logement: z.object({
    pieces: z
      .union([z.number(), z.string()])
      .refine((val) => {
        if (typeof val === "string") return /^\d+(,5)?$/.test(val);
        return val > 0;
      }, "Format invalide pour les pièces"),
    loyerMensuelCHF: z.number().min(0, "Le loyer doit être positif"),
    motif: z.string().min(1, "Le motif est requis"),
  }),

  // Step 4: Finances (ALIGNÉ AVEC STEP4)
  finances: z.array(financeEntrySchema).default([]),

  // Snapshot calculé par Step4 (non validé côté utilisateur)
  pendingLater: z.array(pendingLaterItemSchema).default([]).optional(),

  // ---------- Step 5: Jeunes/Étudiants ----------
  // Bloc ACTUEL utilisé par Step5JeunesEtudiant (singulier)
  jeunesEtudiant: z
    .object({
      formationLausanne: z.boolean().default(false),
      bourseOuRevenuMin: z.boolean().default(false),
      toutPublic: z.boolean().default(false),

      // champs d’IHM Step5
      communeFormation: z.string().optional(),
      motifImperieux: z.string().optional(),
      // fichier côté RHF — on le laisse permissif
      motifImperieuxFile: z.any().optional(),
    })
    .optional(),

  // Bloc ANCIEN conservé pour compatibilité (pluriel)
  jeunesEtudiants: z
    .object({
      attestationEtudes: z.array(uploadSchema).default([]),
      premiereFormationLausanneRegion: z.boolean().default(false),
      bourseActiviteAccessoire: z.number().default(0),
    })
    .optional(),

  // Step 6: Consentements
  consentements: z.object({
    traitementDonnees: z
      .boolean()
      .refine((val) => val === true, "Ce consentement est requis"),
    conditionsGenerales: z
      .boolean()
      .refine((val) => val === true, "Ce consentement est requis"),
  }),

  // Meta
  testMode: z.boolean().default(false),
  currentStep: z.number().default(1),
  lastSaved: z.string().optional(),
  referenceNumber: z.string().optional(),
});

export type FormData = z.infer<typeof formSchema>;
