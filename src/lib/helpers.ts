import { FormData, Member, COREL_COMMUNES } from '@/types/form';

/**
 * Calculate age from birth date
 */
export function calcAge(dateNaissance: string): number {
  if (!dateNaissance) return 0;
  
  const birthDate = new Date(dateNaissance);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Determine if tax decision is required based on address and status
 */
export function requiresTaxDecision(
  address: { canton: string; npaCommune: string }, 
  nationalite: string, 
  permis?: string
): 'required' | 'optional' | 'none' {
  // Permis B/F: never ask for taxation
  if (permis === 'Permis B' || permis === 'Permis F') {
    return 'none';
  }
  
  // Swiss or Permis C
  if (nationalite === 'Suisse' || permis === 'Permis C') {
    // Outside Vaud canton
    if (address.canton !== 'Vaud') {
      return 'required';
    }
    
    // Vaud but not Lausanne
    if (!address.npaCommune.toLowerCase().includes('lausanne')) {
      return 'optional';
    }
    
    // Lausanne commune
    return 'none';
  }
  
  return 'none';
}

/**
 * Build missing documents analysis
 */
export function buildMissingDocs(formData: FormData): {
  blockingDocs: string[];
  warningDocs: { type: 'info' | 'exclusion'; message: string }[];
} {
  const blockingDocs: string[] = [];
  const warningDocs: { type: 'info' | 'exclusion'; message: string }[] = [];
  
  // Check preneur age and emancipation
  const preneur = formData.members.find(m => m.role === 'locataire / preneur');
  if (preneur && preneur.dateNaissance) {
    const age = calcAge(preneur.dateNaissance);
    if (age < 18) {
      blockingDocs.push('Certificat d\'émancipation requis pour preneur mineur');
    }
  }
  
  // Check expired permits
  formData.members.forEach(member => {
    if (member.role === 'locataire / preneur' && member.permis?.dateExpiration) {
      const expDate = new Date(member.permis.dateExpiration);
      if (expDate < new Date()) {
        blockingDocs.push(`Permis de séjour expiré pour ${member.prenom} ${member.nom}`);
      }
    }
  });
  
  // Check income sources
  const allAdults = formData.members.filter(m => {
    if (!m.dateNaissance) return m.role === 'locataire / preneur';
    return calcAge(m.dateNaissance) >= 18;
  });
  
  const hasIncomeMembers = formData.finances.some(finance => 
    finance.sources.some(source => source !== 'sans_revenu')
  );
  
  if (!hasIncomeMembers && allAdults.length > 0) {
    blockingDocs.push('Tous les adultes ne peuvent pas être sans revenu');
  }
  
  // Check student documentation for "Conditions étudiantes"
  if (formData.typeDemande === 'Conditions étudiantes' && formData.jeunesEtudiants) {
    if (formData.jeunesEtudiants.attestationEtudes.length === 0) {
      blockingDocs.push('Attestation d\'études obligatoire pour les conditions étudiantes');
    }
  }
  
  // Check marriage certificates
  formData.members.forEach(member => {
    if (member.etatCivil === 'Marié·e' && member.marriageInfo?.certificat.length === 0) {
      const hasSpouseInHousehold = formData.members.some(m => 
        m.id !== member.id && 
        m.role === 'locataire / preneur' && 
        m.etatCivil === 'Marié·e'
      );
      
      if (!hasSpouseInHousehold) {
        warningDocs.push({
          type: 'info',
          message: `Certificat de mariage manquant pour ${member.prenom} ${member.nom}`
        });
      }
    }
  });
  
  return { blockingDocs, warningDocs };
}

/**
 * Check if commune is in COREL region
 */
export function isCorelCommune(commune: string): boolean {
  return COREL_COMMUNES.includes(commune as any);
}

/**
 * Calculate maximum pieces for household
 * Règle "droit de visite" :
 * - 1 enfant mineur en droit de visite => 0 pièce en plus
 * - >=2 enfants mineurs en droit de visite => +1 pièce (maximum, unique)
 * Les enfants en droit de visite ne sont pas comptés comme "enfants" résidents.
 */
export function calculateMaxPieces(members: any[]): number {
  // === Définition "enfant à charge" ===
  // - < 25 ans OU enfant à naître (si certificat)
  const isDependentChild = (m: any): boolean => {
    if (m.role === 'enfantANaître') return true;
    if (!m.dateNaissance) return false;
    return calcAge(m.dateNaissance) < 25;
  };

  // Aligner avec les valeurs produites par l'UI (Step2Menage):
  // situationEnfant ∈ {"droitDeVisite","gardePartagee"}
  const isVisitation = (m: any): boolean => {
    const v = m?.situationEnfant?.toLowerCase?.() || '';
    // "droitDeVisite" → "droitdevisite"
    return v === 'droitdevisite' || v === 'droit_de_visite' || v === 'droit-de-visite';
  };

  const isSharedCustody = (m: any): boolean => {
    const v = m?.situationEnfant?.toLowerCase?.() || '';
    // "gardePartagee" → "gardepartagee"
    return v === 'gardepartagee' || v === 'garde_partagee' || v === 'garde-partagee';
  };

  // --- Filtre membres valides + exclusions posées par l'UI ---
  const validMembers = members.filter((m) => {
    if (m?._excludedForPieces) return false; // ex: homme seul sans justificatif

    const isSwiss = m?.nationalite?.iso === 'CH';
    if (!isSwiss) {
      const validPermits = ['Permis C', 'Permis B', 'Permis F'];
      if (!validPermits.includes(m?.permis || '')) return false;
      if (['Permis B', 'Permis F'].includes(m.permis)) {
        if (!m.permisExpiration) return false;
        if (new Date(m.permisExpiration) < new Date()) return false;
      }
    }

    if (m.role === 'enfantANaître') return !!m.certificatGrossesse; // enfant à naître seulement si certificat
    return true;
  });

  // --- Comptages sur la base "enfant à charge" (<25) ---
  // Enfants en visite/partagée sont "enfants" uniquement s'ils sont <25
  const visitingDependentChildren = validMembers.filter(
    (m) => isDependentChild(m) && isVisitation(m)
  ).length;

  const hasSharedCustodyDependent = validMembers.some(
    (m) => isDependentChild(m) && isSharedCustody(m)
  );

  // Membres base = on exclut seulement les enfants <25 en "visite"
  const baseMembers = validMembers.filter(
    (m) => !(isDependentChild(m) && isVisitation(m))
  );

  // Adultes = >= 18 (inchangé)
  const adults = baseMembers.filter((m) => {
    if (!m.dateNaissance && (m.role === 'locataire / preneur' || m.role === 'co-titulaire')) return true;
    return m.dateNaissance ? calcAge(m.dateNaissance) >= 18 : false;
  }).length;

  // Enfants pour le barème = enfants à charge (<25) résidents + enfant à naître (si certif)
  const residentChildren = baseMembers.filter((m) => isDependentChild(m)).length;

  // Ta règle : si (≥2 en visite) OU (≥1 en garde partagée) ⇒ on traite comme children === 1 (min 1)
  let childrenForScale = residentChildren;
  if (visitingDependentChildren >= 2 || hasSharedCustodyDependent) {
    childrenForScale = Math.max(childrenForScale, 1);
  }

  // Cas preneur < 25 ans (inchangé)
  const preneur = members.find((x) => x.role === 'locataire / preneur');
  const preneurYoung = preneur?.dateNaissance ? calcAge(preneur.dateNaissance) < 25 : false;

  // Barème inchangé mais appliqué sur childrenForScale
  let basePieces: number;
  if (adults === 1 && childrenForScale === 0) basePieces = preneurYoung ? 1.5 : 2.5;
  else if (adults === 2 && childrenForScale === 0) basePieces = 3.5;
  else if (adults === 2 && childrenForScale === 1) basePieces = 3.5;
  else if (adults === 2 && childrenForScale === 2) basePieces = 4.5;
  else if (adults === 2 && childrenForScale >= 3) basePieces = 5.5;
  else if (adults === 1 && childrenForScale === 1) basePieces = 3.5;
  else if (adults === 1 && childrenForScale === 2) basePieces = 4.5;
  else if (adults === 1 && childrenForScale >= 3) basePieces = 5.5;
  else basePieces = 2.5;

  return basePieces; // pas de bonus visite additionnel
}


export function isHommeSeul(members: any[]): boolean {
  const titulaires = members.filter((m: any) =>
    ['locataire / preneur', 'co-titulaire'].includes(m.role)
  );
  if (titulaires.length !== 1) return false;

  const t = titulaires[0] || {};
  if (t.genre !== 'H') return false;

  return t.etatCivil !== 'Marié·e';
}
/**
 * Generate reference number
 */
export function generateReferenceNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  return `LLM-${year}${month}${day}-${random}`;
}

/**
 * Auto-save key generation
 */
export function generateAutoSaveKey(email: string): string {
  return `llm-form-${email.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-')}`;
}

/**
 * Validate file upload
 */
export function validateFileUpload(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (file.type !== 'application/pdf') {
    return { valid: false, error: 'Seuls les fichiers PDF sont acceptés' };
  }
  
  // Check file size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    return { valid: false, error: 'La taille du fichier ne peut pas dépasser 5 Mo' };
  }
  
  return { valid: true };
}

/**
 * Generate PDF filename for upload
 */
export function generateUploadFilename(
  memberInfo: { nom: string; prenom: string },
  docType: string,
  index: number
): string {
  const slug = `${memberInfo.nom}${memberInfo.prenom}`.toLowerCase()
    .replace(/[^a-zA-Z0-9]/g, '');
  
  return `${slug}${docType}${index}.pdf`;
}