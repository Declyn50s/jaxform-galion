import React, { useEffect, useMemo, useState } from 'react';
import { UseFormReturn, useFieldArray, useWatch } from 'react-hook-form';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { AlertCircle, FileText, Minus, Plus, UserPlus, ChevronDown, ChevronUp } from 'lucide-react';
import { FormData } from '@/types/form';
import { FileUpload } from '@/components/FileUpload';
import { calcAge } from '@/lib/helpers';
import NationalityAutocomplete from "@/components/steps/NationalityAutocomplete";

/**
 * Étape 2 — Ménage
 * - Titulaire obligatoire + co‑titulaire optionnel (max 2 titulaires au total)
 * - Rôles supplémentaires: enfant, autre, enfantANaître
 * - Validations bloquantes + warnings selon cahier des charges
 * - Résumés repliables par membre
 *
 * NOTE: Cette implémentation suppose que votre schéma Zod acceptera
 * les propriétés utilisées ci‑dessous. Si nécessaire, adaptez `FormData`/`Member` dans `@/types/form`.
 */

// Petits utilitaires locaux
const todayISO = () => new Date().toISOString().slice(0, 10);
const isAdultBirthDate = (d?: string) => (d ? calcAge(d) >= 18 : false);
const compactAddr = (m: any) => {
  if (!m?.adresse) return '—';
  const a = m.adresse;
  // Priorité au champ combiné npaCommune, fallback sur npa + commune
  const npaCommune = a.npaCommune || [a.npa, a.commune].filter(Boolean).join(' ');
  const rueNumero = a.rue ? `${a.rue}${a.numero ? ' ' + a.numero : ''}` : '';
  return [rueNumero, npaCommune, a.canton].filter(Boolean).join(', ');
};


// Options de base
const GENRES = [
  { value: 'F', label: 'Femme' },
  { value: 'H', label: 'Homme' },
];

const ROLES = [
  { value: 'locataire / preneur', label: 'Titulaire' },
  { value: 'co-titulaire', label: 'Co‑titulaire' },
  { value: 'enfant', label: 'Enfant' },
  { value: 'autre', label: 'Autre' },
  { value: 'enfantANaître', label: 'Enfant à naître' },
];

const CIVILITES = [
  'Célibataire',
  'Marié·e',
  'Divorcé·e',
  'Séparé·e',
  'Part. dissous',
  'Veuf·ve',
  'Union libre',
];

const PERMIS = ['Permis C', 'Permis B', 'Permis F', 'Autre'] as const;

// Jeu minimum de nationalités (extensible). CH en tête pour l’UX.
const NATIONALITES = [
  { iso: 'CH', name: 'Suisse', emoji: '🇨🇭' },
  { iso: 'FR', name: 'France', emoji: '🇫🇷' },
  { iso: 'IT', name: 'Italie', emoji: '🇮🇹' },
  { iso: 'ES', name: 'Espagne', emoji: '🇪🇸' },
  { iso: 'DE', name: 'Allemagne', emoji: '🇩🇪' },
  { iso: 'PT', name: 'Portugal', emoji: '🇵🇹' },
];

// ------- Types d’appoint (loosely typed pour s’aligner sans casser votre schéma actuel)

type Props = {
  form: UseFormReturn<FormData>;
  testMode: boolean;
  onValidityChange?: (blocked: boolean) => void; // true = bloqué (pour désactiver "Suivant")
};

export function Step2Menage({ form, testMode, onValidityChange }: Props) {
  const { control, watch, setValue } = form;
  const { fields, append, remove, update } = useFieldArray({ control, name: 'members' as any });

  // S’assurer d’un titulaire présent au montage
  useEffect(() => {
    const current: any[] = watch('members') || [];
    if (!current.some((m) => m.role === 'locataire / preneur')) {
      append({
  role: 'locataire / preneur',
  justificatifMariage: null,
  justificatifEtatCivil: null,
  certificatGrossesse: null,
}, { shouldFocus: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const members: any[] = watch('members') || [];

  // ------ Ajouts rapides
  const addCotitulaire = () => {
    const titulaireCount = members.filter((m) => m.role === 'locataire / preneur' || m.role === 'co-titulaire').length;
    if (titulaireCount >= 2) return; // max 2 titulaires au total
    append({ role: 'co-titulaire' });
  };
  const addChild = () => append({ role: 'enfant' });
  const addOther = () => append({ role: 'autre' });
  const addEnfantANaître = () => append({ role: 'enfantANaître' });

  // ------ Validation de l’étape (bloquante et warnings)
  const validations = useMemo(() => computeStepValidations(members), [members]);

  useEffect(() => {
    onValidityChange?.(!validations.isValid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validations.isValid]);

  return (
    <div className="space-y-6">

      {/* Liste des membres */}
      <div className="space-y-4">
        {fields.map((field, index) => (
  <MemberCard
    key={field.id}
    index={index}
    member={members[index]}
    allMembers={members}
    onChange={(partial) =>
      update(index, {
        // ⚠️ garder l'id !
        id: fields[index].id,
        ...(members[index] || {}),
        ...partial,
      })
    }
    onRemove={() => remove(index)}
    isFirst={index === 0}
    setValue={setValue}
    control={control}
  />
))}

 {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={addCotitulaire} variant="secondary" disabled={members.filter((m)=> ['locataire / preneur','co-titulaire'].includes(m.role)).length >= 2}>
          <UserPlus className="h-4 w-4 mr-2" /> Ajouter un co‑titulaire
        </Button>
        <Button type="button" onClick={addChild} variant="outline">
          <Plus className="h-4 w-4 mr-2" /> Ajouter un enfant
        </Button>
        <Button type="button" onClick={addEnfantANaître} variant="outline">
          <Plus className="h-4 w-4 mr-2" /> + Enfant à naître
        </Button>
        <Button type="button" onClick={addOther} variant="outline">
          <Plus className="h-4 w-4 mr-2" /> Ajouter « autre »
        </Button>
      </div>

      {/* Bandeau d’erreurs bloquantes */}
      {validations.blockingErrors.length > 0 && (
        <Alert variant="destructive" role="alert" aria-live="polite">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-2">Corrigez ces éléments avant de continuer :</div>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {validations.blockingErrors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      </div>

      {/* Warnings globaux non bloquants */}
      {validations.warnings.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="text-sm text-yellow-800 space-y-1">
              {validations.warnings.map((w, i) => (
                <div key={i}>⚠️ {w}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ----------------- Composant carte membre avec repli/summary
function MemberCard({
  index,
  allMembers,
  onChange,
  onRemove,
  isFirst,
  control,
  setValue,
}: {
  index: number;
  allMembers: any[];
  onChange: (partial: any) => void;
  onRemove: () => void;
  isFirst: boolean;
  control: UseFormReturn<FormData>['control'];
  setValue: UseFormReturn<FormData>['setValue'];
}) {
    const member = useWatch({ control, name: `members.${index}` }) || {};

  const [open, setOpen] = useState(true);

  const isTitulaire = member.role === 'locataire / preneur' || member.role === 'co-titulaire';
  const isEnfantANaître = member.role === 'enfantANaître';
  const isMinor = member?.dateNaissance ? !isAdultBirthDate(member.dateNaissance) : !isTitulaire && member.role !== 'autre' && !isEnfantANaître;
  const isAdult = !isEnfantANaître && !isMinor;

  const age = member?.dateNaissance ? calcAge(member.dateNaissance) : null;

  // Résumé compact
  const summary = (
    <div className="flex w-full items-start gap-3">
      <Badge variant="secondary" className="mt-0.5">{labelForRole(member.role)}</Badge>
      <div className="flex-1">
        <div className="font-medium">{compactName(member) || 'Non nommé'}</div>
        <div className="text-xs text-muted-foreground">
          {isEnfantANaître ? (
            <>
              {member?.datePrevueAccouchement ? `DPA: ${fmtDate(member.datePrevueAccouchement)}` : 'DPA manquante'}
            </>
          ) : (
            <>
              {age !== null ? `${age} ans` : 'âge —'} • {compactAddr(member)} • {natLabel(member)}
            </>
          )}
        </div>
        {member?._warnings?.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {member._warnings.map((w: string, i: number) => (
              <Badge key={i} variant="outline" className="text-[11px]">⚠︎ {w}</Badge>
            ))}
          </div>
        )}
      </div>
      <Button type="button" variant="ghost" size="icon" onClick={() => setOpen((o)=>!o)} aria-label={open? 'Replier' : 'Déplier'}>
        {open ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>}
      </Button>
      {!isFirst && (
        <Button type="button" variant="ghost" size="icon" onClick={onRemove} aria-label="Supprimer">
          <Minus className="h-4 w-4" />
        </Button>
      )}
    </div>
  );

  return (
    <Card className={member?._blockingError ? 'border-destructive' : ''}>
      <CardHeader>
        <CardTitle className="text-base">{summary}</CardTitle>
      </CardHeader>
      {open && (
        <CardContent className="space-y-4">
          {/* Rôle (lock pour le premier: titulaire) */}
          <div className="grid gap-2 md:grid-cols-3">
            <div>
              <Label>Rôle</Label>
              <Select value={member.role} onValueChange={(v)=>onChange({ role: v })}>
                <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r)=> (
                    <SelectItem key={r.value} value={r.value} disabled={index===0 && r.value!=='locataire / preneur'}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
  <Label>Nom de famille</Label>
  <Input
    value={member.nom || ''}
    onChange={(e) =>
      setValue(
        `members.${index}.nom`,
        e.target.value.toLocaleUpperCase('fr-CH'),
        { shouldDirty: true }
      )
    }
  />
</div>

            <div>
  <Label>Prénom</Label>
  <Input
    value={member.prenom || ''}
    onChange={(e) =>
      setValue(`members.${index}.prenom`, e.target.value, { shouldDirty: true })
    }
    onBlur={() =>
      setValue(
        `members.${index}.prenom`,
        capitalizePrenomSmart(member.prenom || ''),
        { shouldDirty: true }
      )
    }
  />
</div>

          </div>

          {/* Genre + Date de naissance (sauf enfant à naître) */}
          {!isEnfantANaître && (
            <div className="grid gap-2 md:grid-cols-3">
              <div>
                <Label>Genre</Label>
                <Select value={member.genre||''} onValueChange={(v)=>setValue(`members.${index}.genre`, v, { shouldDirty: true })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {GENRES.map((g)=> <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date de naissance</Label>
                <Input type="date" value={member.dateNaissance||''} onChange={(e)=>setValue(`members.${index}.dateNaissance`, e.target.value, { shouldDirty: true })} max={todayISO()} />
              </div>
            </div>
          )}

          {/* DPA pour enfant à naître */}
          {isEnfantANaître && (
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <Label>Date prévue d’accouchement</Label>
                <Input
  type="date"
  value={member.datePrevueAccouchement || ''}
  onChange={(e) =>setValue(`members.${index}.datePrevueAccouchement`, e.target.value, { shouldDirty: true })}/>

              </div>
              <div>
                <Label>Certificat de grossesse (PDF, ≥ 13e SA)</Label>
                <FileUpload accept="application/pdf" value={member.certificatGrossesse||null} onChange={(f)=>setValue(`members.${index}.certificatGrossesse`, f, { shouldDirty: true })} />
              </div>
            </div>
          )}

          {/* Adresse + Same as previous */}
          {!isEnfantANaître && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Adresse (Suisse)</Label>
                {index>0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Switch id={`sameaddr-${index}`} checked={!!member.sameAsPrev} onCheckedChange={(v)=>{
                      if (v) {
                        const prev = allMembers[index-1]?.adresse;
                        onChange({ sameAsPrev: true, adresse: prev? {...prev} : member.adresse });
                      } else {
                        onChange({ sameAsPrev: false });
                      }
                    }} />
                    <Label htmlFor={`sameaddr-${index}`}>Même adresse que la personne précédente</Label>
                  </div>
                )}
              </div>

              <div className="grid gap-2 md:grid-cols-4">
                <div className="md:col-span-2">
                  <Label>Rue</Label>
                  <Input value={member?.adresse?.rue||''} onChange={(e)=>setValue(`members.${index}.adresse.rue`, e.target.value, { shouldDirty: true })} placeholder="ex: Rue de la Gare" />
                </div>
                <div>
                  <Label>N°</Label>
                  <Input value={member?.adresse?.numero||''} onChange={(e)=>setValue(`members.${index}.adresse.numero`, e.target.value, { shouldDirty: true })} />
                </div>
                {/*<div>
                  <Label>Canton</Label>
                  <Input value={member?.adresse?.canton||''} onChange={(e)=>onChange({ adresse: { ...(member.adresse||{}), canton: e.target.value } })} placeholder="VD, GE, …" />
                </div>*/}
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <Label>NPA + Commune</Label>
                  <Input value={member?.adresse?.npaCommune||''} onChange={(e)=>setValue(`members.${index}.adresse.npaCommune`, e.target.value, { shouldDirty: true })} placeholder="1000 Lausanne" />
                </div>
              </div>
              {/* TODO: brancher auto‑complétion adresses suisses ici (Swiss Post, etc.) */}
            </div>
          )}

          {/* Coordonnées (au moins un adulte au total doit avoir téléphone ET email) */}
          {isAdult && (
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <Label>Téléphone</Label>
                <Input value={member.telephone||''} onChange={(e)=>setValue(`members.${index}.telephone`, e.target.value, { shouldDirty: true })} placeholder="ex: +41 79 000 00 00" />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={member.email||''} onChange={(e)=>setValue(`members.${index}.email`, e.target.value, { shouldDirty: true })} placeholder="ex: prenom.nom@mail.ch" />
              </div>
            </div>
          )}

          {/* Nationalité & Permis */}
          {!isEnfantANaître && (
            <div className="grid gap-2 md:grid-cols-3">
              <div className="md:col-span-2">
                <NationalityAutocomplete
              label="Nationalité"
              value={member?.nationalite ?? null}
              onChange={(nat) => {
                if (!nat) {
                onChange({ nationalite: undefined });
                  return;
                }
                const partial: any = {
              nationalite: { iso: nat.iso, name: nat.name, emoji: nat.emoji },
                };
            if (nat.iso === "CH") {
          partial.permis = undefined;
          partial.permisExpiration = undefined;
       }
            onChange(partial); // ← un seul appel, atomique
          }}
        placeholder="Tape « Suisse », « CH », « sui »…"
            />
                </div>
              {/* Permis (masqué si CH) */}
              {member?.nationalite?.iso !== 'CH' && !isEnfantANaître && (
                <div>
                  <Label>Titre de séjour</Label>
                  <Select value={member.permis||''} onValueChange={(v)=>{
                    const partial: any = { permis: v };
                    if (v === 'Permis C') partial.permisExpiration = undefined; // pas de date pour C
                    onChange(partial);
                  }}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      {PERMIS.map((p)=> <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Date d’expiration selon permis */}
          {member?.nationalite?.iso !== 'CH' && member?.permis && ['Permis B', 'Permis F'].includes(member.permis) && (
  <div className="grid gap-2 md:grid-cols-3">
    <div>
      <Label>Date d’expiration du permis</Label>
      <Input
        type="date"
        value={member.permisExpiration || ''}
        onChange={(e)=>setValue(`members.${index}.permisExpiration`, e.target.value, { shouldDirty: true })}
        min={todayISO()}
      />
    </div>
  </div>
)}

          {/* État civil (adulte seulement) */}
          {isAdult && (
            <div className="grid gap-2 md:grid-cols-3">
              <div>
                <Label>État civil</Label>
                <Select
  value={member.etatCivil || ''}
  onValueChange={(v) => {
    setValue(`members.${index}.etatCivil`, v, { shouldDirty: true });

    // Si on quitte les cas qui demandent un justificatif d'état civil, purge
    if (!['Divorcé·e', 'Séparé·e', 'Part. dissous'].includes(v)) {
      setValue(`members.${index}.justificatifEtatCivil`, null, { shouldDirty: true });
      setValue(`members.${index}.justificatifEtatCivilLater`, false, { shouldDirty: true });
    }
    // Si on quitte "Marié·e", purge aussi
    if (v !== 'Marié·e') {
      setValue(`members.${index}.lieuConjoint`, '', { shouldDirty: true });
      setValue(`members.${index}.justificatifMariage`, null, { shouldDirty: true });
    }
  }}
>
  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
  <SelectContent>
    {CIVILITES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
  </SelectContent>
</Select>

              </div>
            </div>
          )}

          {/* Pièces justificatives selon état civil */}
          {isAdult && ['Divorcé·e','Séparé·e','Part. dissous'].includes(member?.etatCivil) && (
            <JustifBloc
              title="Pièce justificative requise"
              subtitle="Jugement complet ratifié par une instance officielle (pas d’extrait)."
              value={member.justificatifEtatCivil||null}
              onChange={(f, later)=> onChange({ justificatifEtatCivil: f, justificatifEtatCivilLater: later })}
            />
          )}

          {/* Cas Marié·e sans conjoint déclaré / incohérences */}
          {isAdult && member?.etatCivil === 'Marié·e' && (
            <div className="space-y-2">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium">Avertissement juridique</div>
                  <p className="text-sm mt-1">
                    En lien avec le droit du bail, les personnes mariées sans officialisation de leur séparation ne peuvent pas s’inscrire.
                  </p>
                </AlertDescription>
              </Alert>
              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <Label>Lieu du conjoint</Label>
                  <Input value={member.lieuConjoint||''} onChange={(e)=>setValue(`members.${index}.lieuConjoint`, e.target.value, { shouldDirty: true })} placeholder="Ville / Pays" />
                </div>
                <div>
                  <Label>Certificat de mariage ou explication (PDF)</Label>
                  <FileUpload accept="application/pdf" value={member.justificatifMariage||null} onChange={(f)=>setValue(`members.${index}.justificatifMariage`, f, { shouldDirty: true })} />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function JustifBloc({ title, subtitle, value, onChange }: { title: string; subtitle: string; value: any; onChange: (file: File|null, later: boolean)=>void }) {
  const [later, setLater] = useState(false);
  return (
    <div className="space-y-2">
      <div className="text-sm">
        <div className="font-medium flex items-center gap-2"><FileText className="h-4 w-4" />{title}</div>
        <div className="text-muted-foreground">{subtitle}</div>
      </div>
      <div className="grid gap-2 md:grid-cols-2 items-end">
        <div>
          <Label>Uploader (PDF)</Label>
          <FileUpload accept="application/pdf" value={value} onChange={(f)=>onChange(f, later)} />
        </div>
        <div className="flex items-center gap-2">
          <Switch id="later" checked={later} onCheckedChange={(v)=>{ setLater(v); onChange(value||null, v); }} />
          <Label htmlFor="later">Joindre plus tard</Label>
        </div>
      </div>
      <Badge variant="outline" className="text-[11px]">⚠︎ Jugement complet requis (pas d’extrait)</Badge>
    </div>
  );
}

// --- Helpers manquants ---
function flagBlock(m: any, blockingErrors: string[], message: string) {
  m._blockingError = true;
  m._warnings = m._warnings || [];
  blockingErrors.push(message);
}

function warn(m: any, warnings: string[], message: string) {
  m._warnings = m._warnings || [];
  m._warnings.push(message);
  warnings.push(message);
}

function fmtDate(iso?: string) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-CH');
  } catch {
    return iso;
  }
}
function capitalizePrenomSmart(input: string) {
  if (!input) return '';
  const seps = new Set([' ', '-', "'", '’']);
  let out = '', cap = true;

  for (const ch of input.normalize('NFC')) {
    if (seps.has(ch)) { out += ch; cap = true; continue; }
    if (cap && /\p{L}/u.test(ch)) { out += ch.toLocaleUpperCase('fr-CH'); cap = false; }
    else { out += ch.toLocaleLowerCase('fr-CH'); }
  }
  return out;
}
// ----------------- Validation cœur (bloquante + warnings). Pure et testable.
function computeStepValidations(members: any[]) {
  const blockingErrors: string[] = [];
  const warnings: string[] = [];

  // Nettoyage des drapeaux sur chaque membre
  members.forEach((m) => { m._blockingError = false; m._warnings = []; });

  // Règle titulaires
  const titulaires = members.filter((m) => ['locataire / preneur','co-titulaire'].includes(m.role));
  if (titulaires.length === 0) {
    blockingErrors.push('Un titulaire est obligatoire.');
  }
  if (titulaires.length > 2) {
    blockingErrors.push('Maximum deux titulaires (titulaire + co‑titulaire).');
  }

  // Champs requis par membre
  members.forEach((m, idx) => {
    const label = displayName(m) || `Membre #${idx+1}`;

    // Nom/Prénom/Genre requis (sauf enfant à naître pour genre/naissance)
    if (!m.nom) flagBlock(m, blockingErrors, `${label} : nom requis.`);
    if (!m.prenom) flagBlock(m, blockingErrors, `${label} : prénom requis.`);
    if (m.role !== 'enfantANaître' && !m.genre) flagBlock(m, blockingErrors, `${label} : genre requis.`);

    // Date de naissance requise sauf enfant à naître
    if (m.role !== 'enfantANaître' && !m.dateNaissance) flagBlock(m, blockingErrors, `${label} : date de naissance requise.`);

    // Adresse requise (hors enfant à naître)
    if (m.role !== 'enfantANaître') {
      const a = m.adresse || {};
      if (!a.rue || !a.npaCommune || !a.canton) flagBlock(m, blockingErrors, `${label} : adresse incomplète (Rue, N°, NPA+Commune, Canton).`);
    }

    // Nationalité requise
   if (m.role !== 'enfantANaître' && !m.nationalite?.iso) { flagBlock(m, blockingErrors, `${label} : nationalité requise.`); 
}

    // Permis de séjour
    const isSwiss = m?.nationalite?.iso === 'CH';
if (!isSwiss && m.role !== 'enfantANaître') {
      if (!m.permis) flagBlock(m, blockingErrors, `${label} : type de permis requis.`);
      else {
        if (['Permis B','Permis F','Autre'].includes(m.permis)) {
          if (!m.permisExpiration) flagBlock(m, blockingErrors, `${label} : date d’expiration du permis requise.`);
          else if (isPastDate(m.permisExpiration) && (m.role === 'locataire / preneur' || m.role === 'co-titulaire')) {
            flagBlock(m, blockingErrors, `${label} : permis expiré — refus bloquant.`);
          }
        }
        if ((m.role === 'locataire / preneur' || m.role === 'co-titulaire')) {
          if (!['Permis C','Permis B','Permis F'].includes(m.permis)) {
            flagBlock(m, blockingErrors, `${label} : permis invalide pour titulaire/co‑titulaire.`);
          }
        } else {
          if (!['Permis C','Permis B','Permis F'].includes(m.permis)) {
            warn(m, warnings, `${label} : permis non reconnu — le membre sera exclu du calcul des pièces.`);
          }
        }
      }
    }

    // État civil — pièces
    const adult = m.role !== 'enfantANaître' && m.dateNaissance && isAdultBirthDate(m.dateNaissance);
    if (adult) {
      if (['Divorcé·e','Séparé·e','Part. dissous'].includes(m.etatCivil)) {
        if (!m.justificatifEtatCivil && !m.justificatifEtatCivilLater) flagBlock(m, blockingErrors, `${label} : justificatif (PDF) requis ou cochez « Joindre plus tard ».`);
      }
      if (m.etatCivil === 'Marié·e') {
        // Cohérence minimale: s'il n'y a qu'un seul adulte → demander conjoint
        const adultCount = members.filter((x)=> x.dateNaissance && isAdultBirthDate(x.dateNaissance)).length;
        if (adultCount < 2) {
          if (!m.lieuConjoint) warn(m, warnings, `${label} : renseignez le lieu du conjoint.`);
          if (!m.justificatifMariage) flagBlock(m, blockingErrors, `${label} : fournir certificat de mariage ou explication (PDF).`);
        }
      }
    }

    // Enfant à naître — DPA + certificat ≥ 13 SA
    if (m.role === 'enfantANaître') {
      if (!m.datePrevueAccouchement) flagBlock(m, blockingErrors, `${label} : date prévue d’accouchement requise.`);
      if (!m.certificatGrossesse) warn(m, warnings, `${label} : sans certificat (≥ 13e semaine), l’enfant ne sera pas comptabilisé.`);
    }
  });

  // Contacts minima (au moins un adulte avec téléphone + email)
  const adults = members.filter((m)=> m.dateNaissance && isAdultBirthDate(m.dateNaissance));
  if (!adults.some((a)=> !!a.telephone)) blockingErrors.push('Au moins un adulte doit fournir un téléphone.');
  if (!adults.some((a)=> !!a.email)) blockingErrors.push('Au moins un adulte doit fournir un email.');

  const isValid = blockingErrors.length === 0;
  return { blockingErrors, warnings, isValid };
}

// ----------------- Helpers de validation/affichage
function isPastDate(iso: string) {
  try {
    const d = new Date(iso);
    const today = new Date();
    d.setHours(0,0,0,0); today.setHours(0,0,0,0);
    return d < today;
  } catch { return false; }
}

function displayName(m: any) {
  return [m?.prenom, m?.nom].filter(Boolean).join(' ');
}

function compactName(m: any) {
  const p = m?.prenom ? m.prenom[0] + '.' : '';
  return [p, m?.nom].filter(Boolean).join(' ');
}

function natLabel(m: any) {
  const iso = m?.nationalite?.iso;
  const n = NATIONALITES.find((x)=> x.iso === iso);
  return n ? `${n.emoji} ${n.iso} ${n.name}` : iso || '—';
}

function labelForRole(role: string) {
  switch (role) {
    case 'locataire / preneur': return 'Titulaire';
    case 'co-titulaire': return 'Co‑titulaire';
    case 'enfant': return 'Enfant';
    case 'autre': return 'Autre';
    case 'enfantANaître': return 'Enfant à naître';
    default: return role;
  }
}
