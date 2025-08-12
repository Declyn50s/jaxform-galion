import { z } from 'zod';

// Base enums and constants
export const COREL_COMMUNES = [
  'Belmont', 'Froideville', 'Prilly', 'Bretigny', 'Jouxtens-Mézery', 'Pully',
  'Bussigny', 'Lausanne', 'Renens', 'Chavannes', 'Lutry', 'Romanel',
  'Cheseaux', 'Mézières', 'St-Sulpice', 'Crissier', 'Le Mont', 'Savigny',
  'Cugy', 'Montpreveyres', 'Villars-St-Croix', 'Ecublens', 'Morrens',
  'Villars-Tiercelin', 'Epalinges', 'Préverenges'
] as const;

export const INCOME_SOURCES = [
  'salarie', 'independant', 'pcfamille', 'ai', 'avs', 'pilier2', 'pc',
  'ri', 'evam', 'chomage', 'pension', 'formation', 'bourse', 'apprentissage',
  'rente_pont', 'autres', 'sans_revenu'
] as const;

export type IncomeSource = typeof INCOME_SOURCES[number];

// Upload schema
export const uploadSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: z.number(),
  type: z.string(),
  lastModified: z.number(),
  url: z.string().optional(),
  status: z.enum(['uploading', 'success', 'error']).default('uploading')
});

// Member schema
export const memberSchema = z.object({
  id: z.string(),
  nom: z.string().min(1, 'Le nom est requis'),
  prenom: z.string().min(1, 'Le prénom est requis'),
  genre: z.enum(['Homme', 'Femme', 'Autre']),
  dateNaissance: z.string().optional(),
  dateAccouchement: z.string().optional(),
  adresse: z.object({
    rue: z.string().min(1, 'La rue est requise'),
    numero: z.string().min(1, 'Le numéro est requis'),
    npaCommune: z.string().min(1, 'NPA et commune sont requis'),
    canton: z.string().min(1, 'Le canton est requis'),
    sameAsPrevious: z.boolean().default(false)
  }),
  telephone: z.string().optional(),
  email: z.string().email().optional(),
  nationalite: z.object({
    pays: z.string().min(1, 'La nationalité est requise'),
    iso: z.string(),
    emoji: z.string()
  }),
  permis: z.object({
    type: z.enum(['C', 'B', 'F', 'Sans permis', 'Autre']).optional(),
    dateExpiration: z.string().optional()
  }).optional(),
  etatCivil: z.enum(['Célibataire', 'Marié·e', 'Divorcé·e', 'Veuf·ve', 'Partenariat']).optional(),
  role: z.enum(['locataire / preneur', 'enfant', 'autre', 'enfantANaître']),
  marriageInfo: z.object({
    lieuConjoint: z.string().optional(),
    certificat: z.array(uploadSchema).default([])
  }).optional(),
  grossesseInfo: z.object({
    certificat: z.array(uploadSchema).default([])
  }).optional()
});

// Income schema
export const incomeSchema = z.object({
  memberId: z.string(),
  sources: z.array(z.enum(INCOME_SOURCES)).default([]),
  details: z.record(z.object({
    montantMensuel: z.number().min(0),
    has13eSalaire: z.boolean().default(false),
    montant13e: z.number().optional(),
    uploads: z.array(uploadSchema).default([]),
    extraFields: z.record(z.any()).optional()
  })).default({})
});

// Main form schema
export const formSchema = z.object({
  // Step 1: Type de demande
  typeDemande: z.enum(['Inscription', 'Contrôle', 'Renouvellement', 'Mise à jour', 'Conditions étudiantes']),
  
  // Pre-filtering for Inscription only
  preFiltering: z.object({
    habiteLausanne3Ans: z.boolean().optional(),
    travailleLausanne3Ans: z.boolean().optional(),
    flagViaWork: z.boolean().default(false)
  }).optional(),

  // Step 2: Ménage
  members: z.array(memberSchema).min(1, 'Au moins un membre est requis'),

  // Step 3: Logement
  logement: z.object({
    pieces: z.union([z.number(), z.string()]).refine((val) => {
      if (typeof val === 'string') {
        return /^\d+(,5)?$/.test(val);
      }
      return val > 0;
    }, 'Format invalide pour les pièces'),
    loyerMensuelCHF: z.number().min(0, 'Le loyer doit être positif'),
    motif: z.string().min(1, 'Le motif est requis')
  }),

  // Step 4: Finances
  finances: z.array(incomeSchema),

  // Step 5: Jeunes/Étudiants (conditional)
  jeunesEtudiants: z.object({
    attestationEtudes: z.array(uploadSchema).default([]),
    premiereFormationLausanneRegion: z.boolean().default(false),
    bourseActiviteAccessoire: z.number().default(0)
  }).optional(),

  // Step 6: Consentements
  consentements: z.object({
    traitementDonnees: z.boolean().refine(val => val === true, 'Ce consentement est requis'),
    conditionsGenerales: z.boolean().refine(val => val === true, 'Ce consentement est requis')
  }),

  // Meta
  testMode: z.boolean().default(false),
  currentStep: z.number().default(1),
  lastSaved: z.string().optional(),
  referenceNumber: z.string().optional()
});

export type FormData = z.infer<typeof formSchema>;
export type Member = z.infer<typeof memberSchema>;
export type Upload = z.infer<typeof uploadSchema>;
export type Income = z.infer<typeof incomeSchema>;