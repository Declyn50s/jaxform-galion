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
import { calcAge, isHommeSeul } from '@/lib/helpers';
import NationalityAutocomplete from "@/components/steps/NationalityAutocomplete";
import { lookupCommunes } from '@/lib/swissNPA';


/**
 * Étape 2 — Ménage
 * - Titulaire obligatoire + co-titulaire optionnel (max 2 titulaires au total)
 * - Rôles supplémentaires: enfant, autre, enfantANaître
 * - Validations bloquantes + warnings selon cahier des charges
 * - Résumés repliables par membre
 */

const todayISO = () => new Date().toISOString().slice(0, 10);
const isAdultBirthDate = (d?: string) => (d ? calcAge(d) >= 18 : false);

// Adresse compacte (gère suisse vs étranger + back-compat)
const compactAddr = (m: any) => {
  if (!m?.adresse) return '—';
  const a = m.adresse;
  const ligne1 =
    a.ligne1 ??
    (a.rue ? `${a.rue}${a.numero ? ' ' + a.numero : ''}` : '');
  const npaCommune =
    a.etranger
      ? [a.commune, a.pays].filter(Boolean).join(', ')
      : (a.npa && a.commune ? `${a.npa} ${a.commune}` :
         a.npaCommune || [a.npa, a.commune].filter(Boolean).join(' '));
  return [ligne1, npaCommune, a.canton].filter(Boolean).join(', ');
};

// Options
const GENRES = [
  { value: 'F', label: '♀️ Femme' },
  { value: 'H', label: '♂️ Homme' },
];

const ROLES = [
  { value: 'locataire / preneur', label: 'Titulaire' },
  { value: 'co-titulaire', label: 'Co-titulaire' },
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

const NATIONALITES = [
  { iso: 'CH', name: 'Suisse', emoji: '🇨🇭' },
  { iso: 'FR', name: 'France', emoji: '🇫🇷' },
  { iso: 'IT', name: 'Italie', emoji: '🇮🇹' },
  { iso: 'ES', name: 'Espagne', emoji: '🇪🇸' },
  { iso: 'DE', name: 'Allemagne', emoji: '🇩🇪' },
  { iso: 'PT', name: 'Portugal', emoji: '🇵🇹' },
];

type Props = {
  form: UseFormReturn<FormData>;
  testMode: boolean;
  onValidityChange?: (blocked: boolean) => void; // true = bloqué (désactiver "Suivant")
  showBlocking?: boolean; // <-- n’afficher les erreurs qu’au clic sur Suivant
};

export function Step2Menage({ form, testMode, onValidityChange, showBlocking = false }: Props) {
  const { control, watch, setValue } = form;
  const { fields, append, remove, update } = useFieldArray({ control, name: 'members' as any });

  useEffect(() => {
    const current: any[] = watch('members') || [];
    if (!current.some((m) => m.role === 'locataire / preneur')) {
      append(
        {
          role: 'locataire / preneur',
          justificatifMariage: null,
          justificatifEtatCivil: null,
          certificatGrossesse: null,
          pieceIdentite: null,
          permisScan: null
        },
        { shouldFocus: false }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const members: any[] = watch('members') || [];

  const addCotitulaire = () => {
    const titulaireCount = members.filter((m) => m.role === 'locataire / preneur' || m.role === 'co-titulaire').length;
    if (titulaireCount >= 2) return;
    append({ role: 'co-titulaire', pieceIdentite: null, permisScan: null });
  };
  const addChild = () => append({ role: 'enfant', pieceIdentite: null, permisScan: null });
  const addOther = () => append({ role: 'autre', pieceIdentite: null, permisScan: null });
  const addEnfantANaître = () => append({ role: 'enfantANaître' });

  const validations = useMemo(() => computeStepValidations(members), [JSON.stringify(members)]);

  useEffect(() => {
    onValidityChange?.(!validations.isValid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validations.isValid]);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {fields.map((field, index) => (
          <MemberCard
            key={field.id}
            index={index}
            member={members[index]}
            allMembers={members}
            onChange={(partial) =>
              update(index, {
                id: fields[index].id,
                ...(members[index] || {}),
                ...partial,
              })
            }
            onRemove={() => remove(index)}
            isFirst={index === 0}
            setValue={setValue}
            control={control}
            blocking={showBlocking && validations.blockingIdx.has(index)}
            highlight={showBlocking}
            invalidPaths={validations.invalidPaths}
          />
        ))}

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={addCotitulaire} variant="secondary" disabled={members.filter((m)=> ['locataire / preneur','co-titulaire'].includes(m.role)).length >= 2}>
            <UserPlus className="h-4 w-4 mr-2" /> Ajouter un co-titulaire
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

        {showBlocking && validations.blockingErrors.length > 0 && (
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
    </div>
  );
}

// ----------------- Carte membre
function MemberCard({
  index,
  member,
  allMembers,
  onChange,
  onRemove,
  isFirst,
  control,
  setValue,
  blocking,
  highlight,
  invalidPaths,
}: {
  index: number;
  member: any;
  allMembers: any[];
  onChange: (partial: any) => void;
  onRemove: () => void;
  isFirst: boolean;
  control: UseFormReturn<FormData>['control'];
  setValue: UseFormReturn<FormData>['setValue'];
  blocking?: boolean;
  highlight?: boolean;
  invalidPaths?: Set<string>;
}) {
  const watched = useWatch({ control, name: `members.${index}` }) || {};
  member = { ...member, ...watched };

  const [open, setOpen] = useState(true);

  const isTitulaire = member.role === 'locataire / preneur' || member.role === 'co-titulaire';
  const isEnfantANaître = member.role === 'enfantANaître';
  const isMinor = member?.dateNaissance ? !isAdultBirthDate(member.dateNaissance) : !isTitulaire && member.role !== 'autre' && !isEnfantANaître;
  const isAdult = !isEnfantANaître && !isMinor;

  const age = member?.dateNaissance ? calcAge(member.dateNaissance) : null;

  const titulairesCount = allMembers.filter((m)=> ['locataire / preneur','co-titulaire'].includes(m.role)).length;
  const isSoloHousehold = titulairesCount === 1; // personne seule

  const invalid = (relPath: string) =>
    !!highlight && !!invalidPaths?.has(`members.${index}.${relPath}`);
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

  // Résumé
  const summary = (
    <div className="flex w-full items-start gap-3">
      <Badge variant="secondary" className="mt-0.5">{labelForRole(member.role)}</Badge>
      <div className="flex-1">
        <div className="font-medium">{displayName(member) || 'Non nommé'}</div>
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

  // Helpers UI adresse
  const npa = member?.adresse?.npa ?? '';
  const etranger = !!member?.adresse?.etranger;
  const communesFromNPA = !etranger && npa ? lookupCommunes(npa) : [];

  return (
    <Card
      className={`
        ${blocking ? "border-destructive" : ""}
        ${member?.genre === "H" ? "bg-blue-100" : ""}
        ${member?.genre === "F" ? "bg-pink-100" : ""}
      `}
    >
      <CardHeader>
        <CardTitle className="text-base">{summary}</CardTitle>
      </CardHeader>
      {open && (
        <CardContent className="space-y-4">
          {/* Rôle */}
          <div className="grid gap-2 md:grid-cols-2">
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

            {!isEnfantANaître && (
              <div>
                <Label>Genre</Label>
                <Select
                  value={member.genre || ''}
                  onValueChange={(v) =>
                    setValue(`members.${index}.genre`, v, { shouldDirty: true })
                  }
                >
                  <SelectTrigger className={invalid('genre') ? 'border-destructive focus-visible:ring-destructive' : ''}>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENRES.map((g) => (
                      <SelectItem key={g.value} value={g.value}>
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {!isEnfantANaître && (
              <>
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
                    className={invalid('nom') ? 'border-destructive focus-visible:ring-destructive' : ''}
                    aria-invalid={invalid('nom')}
                  />
                </div>

                <div>
                  <Label>Prénom</Label>
                  <Input
                    value={member.prenom || ''}
                    onChange={(e) => setValue(`members.${index}.prenom`, e.target.value, { shouldDirty: true })}
                    onBlur={() =>
                      setValue(
                        `members.${index}.prenom`,
                        capitalizePrenomSmart(member.prenom || ''),
                        { shouldDirty: true }
                      )
                    }
                    className={invalid('prenom') ? 'border-destructive focus-visible:ring-destructive' : ''}
                    aria-invalid={invalid('prenom')}
                  />
                </div>
              </>
            )}
          </div>

          {/* Naissance */}
          {!isEnfantANaître && (
            <div className="grid gap-2 md:grid-cols-3">
              <div>
                <Label>Date de naissance</Label>
                <Input
                  type="date"
                  value={member.dateNaissance || ''}
                  onChange={(e) =>
                    setValue(`members.${index}.dateNaissance`, e.target.value, { shouldDirty: true })
                  }
                  max={todayISO()}
                  className={invalid('dateNaissance') ? 'border-destructive focus-visible:ring-destructive' : ''}
                  aria-invalid={invalid('dateNaissance')}
                />
              </div>
            </div>
          )}

          {/* Spécifique ENFANT si preneur homme seul */}
          {member.role === 'enfant' && isHommeSeul(allMembers) && (
            <div className="space-y-3">
              <Alert className="border-yellow-300 bg-yellow-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Sans convention alimentaire ou jugement <strong>ratifié par une instance officielle</strong>,
                  le ou les enfants <strong>ne seront pas pris en compte</strong> et <strong>aucune pièce supplémentaire</strong> ne sera attribuée.
                </AlertDescription>
              </Alert>

              <div className="grid gap-2 md:grid-cols-3">
                <div>
                  <Label>Situation de l’enfant</Label>
                  <Select
                    value={member.situationEnfant || ''}
                    onValueChange={(v) =>
                      setValue(`members.${index}.situationEnfant`, v, { shouldDirty: true })
                    }
                  >
                    <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gardePartagee">Enfant en garde partagée</SelectItem>
                      <SelectItem value="droitDeVisite">Enfant en droit de visite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <Label>Convention alimentaire ou jugement ratifié (PDF)</Label>
                  <FileUpload
                    accept="application/pdf"
                    value={member.justificatifParental || null}
                    onChange={(f) =>
                      setValue(`members.${index}.justificatifParental`, f, { shouldDirty: true })
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* Adresse */}
          {!isEnfantANaître && (
            <div className="space-y-3">
              {/* même adresse que précédent */}
              <div className="flex items-center justify-between">
                {index>0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Switch
                      id={`sameaddr-${index}`}
                      checked={!!member.sameAsPrev}
                      onCheckedChange={(v)=>{
                        if (v) {
                          const prev = allMembers[index-1]?.adresse;
                          onChange({ sameAsPrev: true, adresse: prev? {...prev} : member.adresse });
                        } else {
                          onChange({ sameAsPrev: false });
                        }
                      }}
                    />
                    <Label htmlFor={`sameaddr-${index}`}>Même adresse que la personne précédente</Label>
                  </div>
                )}
              </div>

              <div className="grid gap-2 md:grid-cols-4">
                {/* Adresse (ligne1) */}
                <div className="md:col-span-2">
                  <Label>Adresse N°</Label>
                  <Input
                    placeholder="ex : Rue de la Gare 12"
                    value={
                      member?.adresse?.ligne1 ??
                      [member?.adresse?.rue, member?.adresse?.numero].filter(Boolean).join(' ')
                    }
                    onChange={(e) => {
                      const prev = member?.adresse || {};
                      setValue(
                        `members.${index}.adresse`,
                        {
                          ...prev,
                          ligne1: e.target.value,
                          rue: undefined,
                          numero: undefined,
                        },
                        { shouldDirty: true }
                      );
                    }}
                    className={invalid('adresse.ligne1') ? 'border-destructive focus-visible:ring-destructive' : ''}
                    aria-invalid={invalid('adresse.ligne1')}
                  />
                </div>

                {/* NPA (désactivé si étranger) */}
                <div>
                  <Label>NPA</Label>
                  <Input
                    inputMode="numeric"
                    pattern="\d{4}"
                    placeholder={etranger ? '—' : '1000'}
                    disabled={etranger}
                    value={etranger ? '' : (member?.adresse?.npa ?? '')}
                    onChange={(e) => {
                      const nextNPA = e.target.value.replace(/\D/g, '').slice(0, 4);
                      const prev = member?.adresse || {};

                      const prevCommune = (() => {
                        if (!prev.commune && prev.npaCommune) {
                          const m2 = String(prev.npaCommune).match(/^(\d{4})\s+(.+)$/);
                          if (m2) return m2[2];
                        }
                        return prev.commune || '';
                      })();

                      const communes = lookupCommunes(nextNPA);
                      const nextCommune =
                        communes.length === 1 ? communes[0] :
                        communes.includes(prevCommune) ? prevCommune :
                        '';

                      setValue(
                        `members.${index}.adresse`,
                        { ...prev, npa: nextNPA, commune: nextCommune },
                        { shouldDirty: true }
                      );
                    }}
                    className={invalid('adresse.npa') ? 'border-destructive focus-visible:ring-destructive' : ''}
                    aria-invalid={invalid('adresse.npa')}
                  />
                </div>

                {/* Commune (logique demandée) */}
                <div>
                  <Label>{etranger ? 'Ville / Commune' : 'Commune'}</Label>

                  {/* Étranger → champ libre */}
                  {etranger ? (
                    <Input
                      placeholder="ex : Bruxelles"
                      value={member?.adresse?.commune ?? ''}
                      onChange={(e) =>
                        setValue(`members.${index}.adresse.commune`, e.target.value, { shouldDirty: true })
                      }
                      className={invalid('adresse.commune') ? 'border-destructive focus-visible:ring-destructive' : ''}
                      aria-invalid={invalid('adresse.commune')}
                    />
                  ) : (
                    (() => {
                      const npaLocal = member?.adresse?.npa ?? '';
                      const communes = npaLocal ? lookupCommunes(npaLocal) : [];
                      const current = (() => {
                        if (member?.adresse?.commune) return member.adresse.commune;
                        const nc = member?.adresse?.npaCommune;
                        if (nc) {
                          const m2 = String(nc).match(/^(\d{4})\s+(.+)$/);
                          if (m2) return m2[2];
                        }
                        return '';
                      })();

                      // NPA connu → Select
                      if (npaLocal && communes.length > 0) {
                        return (
                          <Select
                            value={current}
                            onValueChange={(v) =>
                              setValue(`members.${index}.adresse.commune`, v, { shouldDirty: true })
                            }
                          >
                            <SelectTrigger className={invalid('adresse.commune') ? 'border-destructive focus-visible:ring-destructive' : ''}>
                              <SelectValue placeholder="Choisir" />
                            </SelectTrigger>
                            <SelectContent>
                              {communes.map((c) => (
                                <SelectItem key={c} value={c}>
                                  {c}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        );
                      }

                      // NPA inconnu → Input libre
                      return (
                        <Input
                          placeholder="Saisir la commune"
                          value={current}
                          onChange={(e) =>
                            setValue(`members.${index}.adresse.commune`, e.target.value, { shouldDirty: true })
                          }
                          className={invalid('adresse.commune') ? 'border-destructive focus-visible:ring-destructive' : ''}
                          aria-invalid={invalid('adresse.commune')}
                        />
                      );
                    })()
                  )}
                </div>

                {/* Étranger toggle */}
                <div className="flex items-center gap-2">
                  <Switch
                    id={`addr-etranger-${index}`}
                    checked={etranger}
                    onCheckedChange={(v)=>{
                      const prev = member?.adresse || {};
                      const next = {
                        ...prev,
                        etranger: v,
                        npa: v ? '' : prev.npa ?? '',
                        commune: v ? '' : prev.commune ?? '',
                        npaCommune: undefined,
                      } as any;
                      if (!v) next.pays = '';
                      setValue(`members.${index}.adresse`, next, { shouldDirty: true });
                    }}
                  />
                  <Label htmlFor={`addr-etranger-${index}`}>Adresse à l’étranger</Label>
                </div>

                {/* Pays (affiché uniquement si étranger) */}
                {etranger && (
                  <div>
                    <Label>Pays</Label>
                    <Input
                      placeholder="ex : Belgique"
                      value={member?.adresse?.pays ?? ''}
                      onChange={(e) =>
                        setValue(`members.${index}.adresse.pays`, e.target.value, { shouldDirty: true })
                      }
                      className={invalid('adresse.pays') ? 'border-destructive focus-visible:ring-destructive' : ''}
                      aria-invalid={invalid('adresse.pays')}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Coordonnées (au moins un adulte avec tel+email) */}
          {isAdult && (
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <Label>Téléphone</Label>
                <div className="flex gap-2">
                  {/* Sélecteur indicatif */}
                  <Select
                    value={member.telephoneIndicatif || "+41"}
                    onValueChange={(v) =>
                      setValue(`members.${index}.telephoneIndicatif`, v, { shouldDirty: true })
                    }
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue placeholder="Indicatif" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="+41">🇨🇭 +41</SelectItem>
                      <SelectItem value="+33">🇫🇷 +33</SelectItem>
                      <SelectItem value="+39">🇮🇹 +39</SelectItem>
                      <SelectItem value="+34">🇪🇸 +34</SelectItem>
                      <SelectItem value="+49">🇩🇪 +49</SelectItem>
                      <SelectItem value="+351">🇵🇹 +351</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Champ numéro */}
                  <Input
                    className={`flex-1 ${invalid('telephone') ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    aria-invalid={invalid('telephone')}
                    placeholder="079 123 45 67"
                    value={member.telephone || ""}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, "").slice(0, 10);
                      const parts: string[] = [];
                      if (val.length > 0) parts.push(val.substring(0, 3));
                      if (val.length > 3) parts.push(val.substring(3, 6));
                      if (val.length > 6) parts.push(val.substring(6, 8));
                      if (val.length > 8) parts.push(val.substring(8, 10));
                      const formatted = parts.join(" ");
                      setValue(`members.${index}.telephone`, formatted, { shouldDirty: true });
                    }}
                  />
                </div>
              </div>

              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={member.email || ""}
                  onChange={(e) =>
                    setValue(`members.${index}.email`, e.target.value, { shouldDirty: true })
                  }
                  placeholder="ex: prenom.nom@mail.ch"
                  className={invalid('email') ? 'border-destructive focus-visible:ring-destructive' : ''}
                  aria-invalid={invalid('email')}
                />
              </div>
            </div>
          )}

          {/* Nationalité & Permis */}
          {!isEnfantANaître && (
            <div className="grid gap-2 md:grid-cols-4">
              <div className={`md:col-span-2 ${invalid('nationalite.iso') ? 'ring-1 ring-destructive rounded-lg p-2' : ''}`}>
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
                      partial.permisScan = null;
                    }
                    onChange(partial);
                  }}
                  placeholder="Tape « Suisse », « CH », « sui »…"
                />
              </div>

              {member?.nationalite?.iso !== 'CH' && !isEnfantANaître && (
                <div>
                  <Label>Titre de séjour</Label>
                  <Select value={member.permis||''} onValueChange={(v)=>{
                    const partial: any = { permis: v };
                    if (v === 'Permis C') partial.permisExpiration = undefined;
                    onChange(partial);
                  }}>
                    <SelectTrigger className={invalid('permis') ? 'border-destructive focus-visible:ring-destructive' : ''}>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
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
                  className={invalid('permisExpiration') ? 'border-destructive focus-visible:ring-destructive' : ''}
                  aria-invalid={invalid('permisExpiration')}
                />
              </div>
            </div>
          )}

          {/* Pièces d’identité selon nationalité */}
          {!isEnfantANaître && (
            <div className="space-y-2">
              <div className="grid gap-2 md:grid-cols-2 items-end">
                {member?.nationalite?.iso === 'CH' && (
                  <div className={invalid('pieceIdentite') ? 'ring-1 ring-destructive rounded-lg p-2' : ''}>
                    <Label>Papiers d’identité (carte d’identité ou passeport)</Label>
                    <FileUpload
                      accept="application/pdf,image/*,.jpg,.jpeg,.png,.heic"
                      value={member.pieceIdentite || null}
                      onChange={(f) => setValue(`members.${index}.pieceIdentite`, f, { shouldDirty: true })}
                    />
                  </div>
                )}

                {member?.nationalite?.iso !== 'CH' &&
                  ['Permis C', 'Permis B', 'Permis F'].includes(member?.permis || '') && (
                    <div className={invalid('permisScan') ? 'ring-1 ring-destructive rounded-lg p-2' : ''}>
                      <Label>Titre de séjour ({member.permis})</Label>
                      <FileUpload
                        accept="application/pdf,image/jpeg,image/png"
                        value={member.permisScan || null}
                        onChange={(f) =>
                          setValue(`members.${index}.permisScan`, f, { shouldDirty: true })
                        }
                      />
                    </div>
                  )}
              </div>
            </div>
          )}

          {/* État civil */}
          {isAdult && (
  <div className="grid gap-2 md:grid-cols-3">
    <div>
      <Label>État civil</Label>
      <Select
        value={member.etatCivil || ''}
        onValueChange={(v) => {
          setValue(`members.${index}.etatCivil`, v, { shouldDirty: true });
          if (!['Divorcé·e', 'Séparé·e', 'Part. dissous'].includes(v)) {
            setValue(`members.${index}.justificatifEtatCivil`, null, { shouldDirty: true });
            setValue(`members.${index}.justificatifEtatCivilLater`, false, { shouldDirty: true });
          }
          if (v !== 'Marié·e') {
            setValue(`members.${index}.lieuConjoint`, '', { shouldDirty: true });
            setValue(`members.${index}.justificatifMariage`, null, { shouldDirty: true });
          }
        }}
      >
        <SelectTrigger className={invalid('etatCivil') ? 'border-destructive focus-visible:ring-destructive' : ''}>
          <SelectValue placeholder="Sélectionner" />
        </SelectTrigger>
        <SelectContent>
          {CIVILITES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  </div>
)}


          {/* Pièces justificatives selon état civil */}
          {isAdult && ['Divorcé·e','Séparé·e','Part. dissous'].includes(member?.etatCivil) && (
            <div className={invalid('justificatifEtatCivil') ? 'ring-1 ring-destructive rounded-lg p-2' : ''}>
              <JustifBloc
                title="Pièce justificative requise"
                subtitle="Jugement complet ratifié par une instance officielle (pas d’extrait)."
                value={member.justificatifEtatCivil||null}
                onChange={(file, later) => {
                  setValue(`members.${index}.justificatifEtatCivil`, file, { shouldDirty: true });
                  setValue(`members.${index}.justificatifEtatCivilLater`, later, { shouldDirty: true });
                }}
              />
            </div>
          )}

          {/* Cas Marié·e — seulement si la personne est seule */}
          {isAdult && member?.etatCivil === 'Marié·e' && isSoloHousehold && (
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
                  <Input
                    value={member.lieuConjoint||''}
                    onChange={(e)=>setValue(`members.${index}.lieuConjoint`, e.target.value, { shouldDirty: true })}
                    placeholder="Ville / Pays"
                  />
                </div>
                <div className={invalid('justificatifMariage') ? 'ring-1 ring-destructive rounded-lg p-2' : ''}>
                  <Label>Certificat de mariage ou explication (PDF)</Label>
                  <FileUpload
                    accept="application/pdf"
                    value={member.justificatifMariage||null}
                    onChange={(f)=>setValue(`members.${index}.justificatifMariage`, f, { shouldDirty: true })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ——————————— Curateur (adulte uniquement) ——————————— */}
          {isAdult && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Switch
                  id={`curateur-enabled-${index}`}
                  checked={!!member?.curateur?.enabled}
                  onCheckedChange={(v) => {
                    const prev = member?.curateur || {};
                    setValue(`members.${index}.curateur`, { ...prev, enabled: v }, { shouldDirty: true });
                  }}
                />
                <Label htmlFor={`curateur-enabled-${index}`}>Curateur</Label>
              </div>

              {member?.curateur?.enabled && (
                <div className="space-y-3 border rounded-lg p-3 bg-muted/40">
                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <Label>Nom du/de la curateur·trice</Label>
                      <Input
                        value={member?.curateur?.nom || ''}
                        onChange={(e) =>
                          setValue(`members.${index}.curateur.nom`, e.target.value, { shouldDirty: true })
                        }
                        placeholder="ex : SCTP"
                      />
                    </div>
                  </div>

                  {/* Adresse du curateur */}
                  {(() => {
                    const cEtranger = !!member?.curateur?.adresse?.etranger;
                    const cNpa = member?.curateur?.adresse?.npa ?? '';
                    const communes = !cEtranger && cNpa ? lookupCommunes(cNpa) : [];
                    const currentCommune = (() => {
                      const a = member?.curateur?.adresse || {};
                      if (a.commune) return a.commune;
                      if (a.npaCommune) {
                        const m2 = String(a.npaCommune).match(/^(\d{4})\s+(.+)$/);
                        if (m2) return m2[2];
                      }
                      return '';
                    })();

                    return (
                      <div className="space-y-3">
                        <div className="grid gap-2 md:grid-cols-4">
                          <div className="md:col-span-2">
                            <Label>Adresse N°</Label>
                            <Input
                              placeholder="ex : Chemin de Mornex 32"
                              value={
                                member?.curateur?.adresse?.ligne1 ??
                                [member?.curateur?.adresse?.rue, member?.curateur?.adresse?.numero].filter(Boolean).join(' ')
                              }
                              onChange={(e) => {
                                const prev = member?.curateur?.adresse || {};
                                setValue(
                                  `members.${index}.curateur.adresse`,
                                  {
                                    ...prev,
                                    ligne1: e.target.value,
                                    rue: undefined,
                                    numero: undefined,
                                  },
                                  { shouldDirty: true }
                                );
                              }}
                            />
                          </div>

                          <div>
                            <Label>NPA</Label>
                            <Input
                              inputMode="numeric"
                              pattern="\d{4}"
                              placeholder={cEtranger ? '—' : '1014'}
                              disabled={cEtranger}
                              value={cEtranger ? '' : (member?.curateur?.adresse?.npa ?? '')}
                              onChange={(e) => {
                                const nextNPA = e.target.value.replace(/\D/g, '').slice(0, 4);
                                const prev = member?.curateur?.adresse || {};
                                const prevCommune = (() => {
                                  if (!prev.commune && prev.npaCommune) {
                                    const m2 = String(prev.npaCommune).match(/^(\d{4})\s+(.+)$/);
                                    if (m2) return m2[2];
                                  }
                                  return prev.commune || '';
                                })();
                                const cs = lookupCommunes(nextNPA);
                                const nextCommune =
                                  cs.length === 1 ? cs[0] :
                                  cs.includes(prevCommune) ? prevCommune : '';

                                setValue(
                                  `members.${index}.curateur.adresse`,
                                  { ...prev, npa: nextNPA, commune: nextCommune },
                                  { shouldDirty: true }
                                );
                              }}
                            />
                          </div>

                          <div>
                            <Label>{cEtranger ? 'Ville / Commune' : 'Commune'}</Label>
                            {cEtranger ? (
                              <Input
                                placeholder="ex : Bruxelles"
                                value={member?.curateur?.adresse?.commune ?? ''}
                                onChange={(e) =>
                                  setValue(`members.${index}.curateur.adresse.commune`, e.target.value, { shouldDirty: true })
                                }
                              />
                            ) : (
                              <>
                                {cNpa && communes.length > 0 ? (
                                  <Select
                                    value={currentCommune}
                                    onValueChange={(v) =>
                                      setValue(`members.${index}.curateur.adresse.commune`, v, { shouldDirty: true })
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Choisir" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {communes.map((c) => (
                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Input
                                    placeholder="Saisir la commune"
                                    value={currentCommune}
                                    onChange={(e) =>
                                      setValue(`members.${index}.curateur.adresse.commune`, e.target.value, { shouldDirty: true })
                                    }
                                  />
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Coordonnées curateur (optionnelles) */}
                  <div className="grid gap-2 md:grid-cols-2">
                    <div>
                      <Label>Téléphone (optionnel)</Label>
                      <div className="flex gap-2">
                        <Select
                          value={member?.curateur?.telephoneIndicatif || '+41'}
                          onValueChange={(v) =>
                            setValue(`members.${index}.curateur.telephoneIndicatif`, v, { shouldDirty: true })
                          }
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue placeholder="Indicatif" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="+41">🇨🇭 +41</SelectItem>
                          </SelectContent>
                        </Select>

                        <Input
                          className="flex-1"
                          placeholder="021 316 66 66"
                          value={member?.curateur?.telephone || ''}
                          onChange={(e) => {
                            let val = e.target.value.replace(/\D/g, '').slice(0, 10);
                            const parts: string[] = [];
                            if (val.length > 0) parts.push(val.substring(0, 3));
                            if (val.length > 3) parts.push(val.substring(3, 6));
                            if (val.length > 6) parts.push(val.substring(6, 8));
                            if (val.length > 8) parts.push(val.substring(8, 10));
                            const formatted = parts.join(' ');
                            setValue(`members.${index}.curateur.telephone`, formatted, { shouldDirty: true });
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Email (optionnel)</Label>
                      <Input
                        type="email"
                        value={member?.curateur?.email || ''}
                        onChange={(e) =>
                          setValue(`members.${index}.curateur.email`, e.target.value, { shouldDirty: true })
                        }
                        placeholder="ex: curateur@mail.ch"
                      />
                    </div>
                  </div>
                </div>
              )}
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
    </div>
  );
}

// ----------------- Validation cœur
function computeStepValidations(members: any[]) {
  const blockingErrors: string[] = [];
  const warnings: string[] = [];
  const blockingIdx = new Set<number>();
  const invalidPaths = new Set<string>();

  const addError = (msg: string) => blockingErrors.push(msg);
  const mark = (idx: number, relPath: string, msg?: string) => {
    if (msg) addError(msg);
    blockingIdx.add(idx);
    invalidPaths.add(`members.${idx}.${relPath}`);
  };
  const addWarn = (_idx: number, _msg: string) => warnings.push(_msg);

  const isAdultBirthDate = (d?: string) => (d ? calcAge(d) >= 18 : false);
  const titulaires = members.filter((m) =>
    ['locataire / preneur', 'co-titulaire'].includes(m.role)
  );

  if (titulaires.length === 0) addError('Un titulaire est obligatoire.');
  if (titulaires.length > 2) addError('Maximum deux titulaires (titulaire + co-titulaire).');

  members.forEach((m, idx) => {
    const label = displayName(m) || `Membre #${idx+1}`;

    if (!m.nom) mark(idx, 'nom', `${label} : nom requis.`);
    if (!m.prenom) mark(idx, 'prenom', `${label} : prénom requis.`);
    if (m.role !== 'enfantANaître' && !m.genre) mark(idx, 'genre', `${label} : genre requis.`);
    if (m.role !== 'enfantANaître' && !m.dateNaissance) mark(idx, 'dateNaissance', `${label} : date de naissance requise.`);

    // Adresse
    if (m.role !== 'enfantANaître') {
      const a = { ...(m.adresse || {}) };
      if (!a.npa && !a.commune && a.npaCommune) {
        const m2 = String(a.npaCommune).match(/^(\d{4})\s+(.+)$/);
        if (m2) { a.npa = m2[1]; a.commune = m2[2]; }
      }
      if (a.etranger) {
        if (!a.ligne1) mark(idx, 'adresse.ligne1', `${label} : adresse étrangère incomplète (Adresse, Ville/Commune, Pays).`);
        if (!a.commune) mark(idx, 'adresse.commune');
        if (!a.pays) mark(idx, 'adresse.pays');
      } else {
        if (!a.ligne1) mark(idx, 'adresse.ligne1', `${label} : adresse incomplète (Adresse, NPA, Commune).`);
        if (!a.npa) mark(idx, 'adresse.npa');
        if (!a.commune) mark(idx, 'adresse.commune');
      }
    }

    // Nationalité
    if (m.role !== 'enfantANaître' && !m?.nationalite?.iso) {
      mark(idx, 'nationalite.iso', `${label} : nationalité requise.`);
    }

    // Permis
    const isSwiss = m?.nationalite?.iso === 'CH';
    if (!isSwiss && m.role !== 'enfantANaître') {
      if (!m.permis) mark(idx, 'permis', `${label} : type de permis requis.`);
      else {
        if (['Permis B','Permis F','Autre'].includes(m.permis)) {
          if (!m.permisExpiration) mark(idx, 'permisExpiration', `${label} : date d’expiration du permis requise.`);
          else if (isPastDate(m.permisExpiration) && (m.role === 'locataire / preneur' || m.role === 'co-titulaire')) {
            mark(idx, 'permisExpiration', `${label} : permis expiré — refus bloquant.`);
          }
        }
        if ((m.role === 'locataire / preneur' || m.role === 'co-titulaire')) {
          if (!['Permis C','Permis B','Permis F'].includes(m.permis)) {
            mark(idx, 'permis', `${label} : permis invalide pour titulaire/co-titulaire.`);
          }
        } else {
          if (!['Permis C','Permis B','Permis F'].includes(m.permis)) {
            addWarn(idx, `${label} : permis non reconnu — le membre sera exclu du calcul des pièces.`);
          }
        }
      }
    }

    // Pièces d’identité (adultes et “autre”)
    if (m.role !== 'enfantANaître' && m.role !== 'enfant') {
      if (!m.pieceIdentite) {
        mark(idx, 'pieceIdentite', `${label} : papiers d’identité manquants (carte d’identité ou passeport).`);
      }
      const isSwiss2 = m?.nationalite?.iso === 'CH';
      if (!isSwiss2 && ['Permis C','Permis B','Permis F'].includes(m?.permis || '')) {
        if (!m.permisScan) {
          mark(idx, 'permisScan', `${label} : scan du titre de séjour (${m.permis}) requis.`);
        }
      }
    }

    // État civil — pièces
    const adult = m.role !== 'enfantANaître' && m.dateNaissance && isAdultBirthDate(m.dateNaissance);
    if (adult) {
  if (!m.etatCivil) { mark(idx, 'etatCivil', `${label} : état civil requis.`); }

  if (['Divorcé·e','Séparé·e','Part. dissous'].includes(m.etatCivil)) {
    if (!m.justificatifEtatCivil && !m.justificatifEtatCivilLater) {
      mark(idx, 'justificatifEtatCivil', `${label} : justificatif (PDF) requis ou cochez « Joindre plus tard ».`);
    }
  }
  if (m.etatCivil === 'Marié·e') {
    const adultCount = members.filter((x)=> x.dateNaissance && isAdultBirthDate(x.dateNaissance)).length;
    if (adultCount < 2) {
      if (!m.lieuConjoint) addWarn(idx, `${label} : renseignez le lieu du conjoint.`);
      if (!m.justificatifMariage) mark(idx, 'justificatifMariage', `${label} : fournir certificat de mariage ou explication (PDF).`);
    }
  }
}

    // Enfant à naître
    if (m.role === 'enfantANaître') {
      if (!m.datePrevueAccouchement) mark(idx, 'datePrevueAccouchement', `${label} : date prévue d’accouchement requise.`);
      if (!m.certificatGrossesse) addWarn(idx, `${label} : sans certificat (≥ 13e semaine), l’enfant ne sera pas comptabilisé.`);
    }
  });

  // Contacts minima — si personne n’a de téléphone/email, on marque les champs vides chez tous les adultes
  const adults = members.filter((m)=> m.dateNaissance && isAdultBirthDate(m.dateNaissance));
  const anyPhone = adults.some(a => !!a.telephone);
  const anyEmail = adults.some(a => !!a.email);
  if (!anyPhone) {
    addError('Au moins un adulte doit fournir un téléphone.');
    adults.forEach((a) => { if (!a.telephone) invalidPaths.add(`members.${members.indexOf(a)}.telephone`); });
  }
  if (!anyEmail) {
    addError('Au moins un adulte doit fournir un email.');
    adults.forEach((a) => { if (!a.email) invalidPaths.add(`members.${members.indexOf(a)}.email`); });
  }

  const isValid = blockingErrors.length === 0;
  return { blockingErrors, warnings, isValid, blockingIdx, invalidPaths };

  if (['locataire / preneur', 'co-titulaire'].includes(m.role) && m.dateNaissance) {
  const age = calcAge(m.dateNaissance);
  if (age !== null && age < 18) {
    mark(
      idx,
      'dateNaissance',
      `${label} : un titulaire doit avoir au moins 18 ans (âge actuel : ${age}).`
    );
  }
}
}

// ----------------- Helpers
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
    case 'co-titulaire': return 'Co-titulaire';
    case 'enfant': return 'Enfant';
    case 'autre': return 'Autre';
    case 'enfantANaître': return 'Enfant à naître';
    default: return role;
  }
}
