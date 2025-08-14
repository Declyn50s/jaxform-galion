export interface Nationality {
  name: string;
  iso: string;
  emoji: string;
}

export const nationalities: Nationality[] = [
  { name: "Suisse", iso: "CH", emoji: "🇨🇭" },
  { name: "France", iso: "FR", emoji: "🇫🇷" },
  { name: "Allemagne", iso: "DE", emoji: "🇩🇪" },
  { name: "Italie", iso: "IT", emoji: "🇮🇹" },
  { name: "Espagne", iso: "ES", emoji: "🇪🇸" },
  { name: "Portugal", iso: "PT", emoji: "🇵🇹" },
  { name: "Autriche", iso: "AT", emoji: "🇦🇹" },
  { name: "Belgique", iso: "BE", emoji: "🇧🇪" },
  { name: "Pays-Bas", iso: "NL", emoji: "🇳🇱" },
  { name: "Royaume-Uni", iso: "GB", emoji: "🇬🇧" },
  { name: "États-Unis", iso: "US", emoji: "🇺🇸" },
  { name: "Canada", iso: "CA", emoji: "🇨🇦" },
  { name: "Brésil", iso: "BR", emoji: "🇧🇷" },
  { name: "Argentine", iso: "AR", emoji: "🇦🇷" },
  { name: "Maroc", iso: "MA", emoji: "🇲🇦" },
  { name: "Algérie", iso: "DZ", emoji: "🇩🇿" },
  { name: "Tunisie", iso: "TN", emoji: "🇹🇳" },
  { name: "Turquie", iso: "TR", emoji: "🇹🇷" },
  { name: "Russie", iso: "RU", emoji: "🇷🇺" },
  { name: "Chine", iso: "CN", emoji: "🇨🇳" },
  { name: "Japon", iso: "JP", emoji: "🇯🇵" },
  { name: "Inde", iso: "IN", emoji: "🇮🇳" },
  { name: "Australie", iso: "AU", emoji: "🇦🇺" },
  // Add more as needed
];

export function searchNationalities(query: string): Nationality[] {
  if (!query) return nationalities;
  
  const lowerQuery = query.toLowerCase();
  return nationalities.filter(nat => 
    nat.name.toLowerCase().includes(lowerQuery) ||
    nat.iso.toLowerCase().includes(lowerQuery)
  );
}