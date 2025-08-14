"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Camera, Upload, Trash2, CheckCircle2, AlertCircle, Mail } from "lucide-react";

/**
 * Étape 6 — Consentements (version sans dépendances shadcn Alert/Separator)
 * - Upload + aperçu selfie (obligatoire)
 * - 2 consentements toujours visibles + 1 conditionnel si hasOtherAdults
 * - Encadré optionnel: collecte par e-mail
 * - Validation côté client + état de soumission
 * - Accessibilité correcte
 */
export default function Step6Consentements({
  hasOtherAdults = false,
}: {
  hasOtherAdults?: boolean;
}) {
  // Selfie
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Consentements
  const [certExactitude, setCertExactitude] = useState(false);
  const [accesRDU, setAccesRDU] = useState(false);
  const [accordAutresAdultes, setAccordAutresAdultes] = useState(false);

  // Encadré optionnel (hors validation)
  const [collecteEmail, setCollecteEmail] = useState(false);
  const [email, setEmail] = useState("");

  // Soumission
  const [submitting, setSubmitting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  // Aperçu selfie
  useEffect(() => {
    if (!selfieFile) {
      setSelfiePreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(selfieFile);
    setSelfiePreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selfieFile]);

  // Validation
  const errors = useMemo(() => {
    const list: string[] = [];
    if (!selfieFile) list.push("Un selfie est requis.");
    if (!certExactitude) list.push("Vous devez certifier l’exactitude des informations.");
    if (!accesRDU) list.push("Vous devez autoriser l’accès aux données financières (RDU).");
    if (hasOtherAdults && !accordAutresAdultes) {
      list.push("Vous devez confirmer l’accord explicite des autres adultes du ménage.");
    }
    return list;
  }, [selfieFile, certExactitude, accesRDU, accordAutresAdultes, hasOtherAdults]);

  const isValid = errors.length === 0;

  // Fichier
  const onPickFile = () => fileInputRef.current?.click();
  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      alert("Veuillez sélectionner une image (JPEG/PNG/HEIC, etc.).");
      e.target.value = "";
      return;
    }
    setSelfieFile(f);
    setShowErrors(false);
  };
  const onRemoveFile = () => {
    setSelfieFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Soumission factice
  const onSave = async () => {
    setShowErrors(true);
    if (!isValid) return;
    try {
      setSubmitting(true);
      // // Exemple d'envoi
      // const fd = new FormData();
      // if (selfieFile) fd.append("selfie", selfieFile);
      // fd.append("certExactitude", String(certExactitude));
      // fd.append("accesRDU", String(accesRDU));
      // if (hasOtherAdults) fd.append("accordAutresAdultes", String(accordAutresAdultes));
      // if (collecteEmail) fd.append("collecteEmail", email);
      // await fetch("/api/consentements", { method: "POST", body: fd });
      await new Promise((r) => setTimeout(r, 900));
      alert("Consentements enregistrés. Vous pouvez passer à l'étape suivante.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mx-auto"
      aria-labelledby="titre-consentements"
    >
      <Card className="overflow-hidden">
        <CardHeader className="space-y-1">
          <CardTitle id="titre-consentements" className="text-2xl">
            Étape 6 — Consentements
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Les cases suivantes sont requises et ne constituent pas une signature électronique.
          </p>
        </CardHeader>

        <CardContent>
          {/* Bloc selfie */}
          <div className="space-y-3">
            <Label htmlFor="selfie" className="text-base font-medium">
              Un selfie (Photo obligatoire pour identification)
            </Label>

            <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
              {/* Aperçu */}
              <div className="w-28 h-28 rounded-xl border bg-muted/30 flex items-center justify-center overflow-hidden">
                {selfiePreview ? (
                  <img
                    src={selfiePreview}
                    alt="Aperçu du selfie sélectionné"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Camera aria-hidden className="w-7 h-7 opacity-70" />
                )}
              </div>

              {/* Actions upload */}
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  id="selfie"
                  name="selfie"
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="sr-only"
                  onChange={onFileChange}
                />
                {!selfiePreview ? (
                  <Button type="button" variant="secondary" onClick={onPickFile} className="gap-2">
                    <Upload className="h-4 w-4" aria-hidden />
                    Importer un selfie
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button type="button" onClick={onPickFile} className="gap-2">
                      <Upload className="h-4 w-4" aria-hidden />
                      Changer la photo
                    </Button>
                    <Button type="button" variant="outline" onClick={onRemoveFile} className="gap-2">
                      <Trash2 className="h-4 w-4" aria-hidden />
                      Retirer
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Séparateur */}
          <hr className="my-6 border-muted" />

          {/* Consentements */}
          <div className="space-y-4">
            {/* 1. Certificat d’exactitude */}
            <div className="flex items-start gap-3">
              <Checkbox
                id="cert-exactitude"
                checked={certExactitude}
                onCheckedChange={(v) => setCertExactitude(Boolean(v))}
                aria-describedby="desc-cert-exactitude"
              />
              <div className="grid gap-1.5">
                <Label htmlFor="cert-exactitude" className="font-medium">
                  Certificat d’exactitude
                </Label>
                <p id="desc-cert-exactitude" className="text-sm text-muted-foreground">
                  Je certifie que toutes les informations communiquées dans ce formulaire sont exactes.
                </p>
              </div>
            </div>

            {/* 2. Accès aux données financières (RDU) */}
            <div className="flex items-start gap-3">
              <Checkbox
                id="acces-rdu"
                checked={accesRDU}
                onCheckedChange={(v) => setAccesRDU(Boolean(v))}
                aria-describedby="desc-acces-rdu"
              />
              <div className="grid gap-1.5">
                <Label htmlFor="acces-rdu" className="font-medium">
                  Accès aux données financières (RDU)
                </Label>
                <p id="desc-acces-rdu" className="text-sm text-muted-foreground">
                  J’autorise l’Unité Logements à Loyers Modérés (LLM) à accéder à mes données financières, y compris fiscales, figurant dans le système d’information du Revenu Déterminant Unifié (RDU).
                </p>
              </div>
            </div>

            {/* 3. (Conditionnelle) Accord des autres adultes du ménage */}
            {hasOtherAdults && (
              <div className="flex items-start gap-3">
                <Checkbox
                  id="accord-autres"
                  checked={accordAutresAdultes}
                  onCheckedChange={(v) => setAccordAutresAdultes(Boolean(v))}
                  aria-describedby="desc-accord-autres"
                />
                <div className="grid gap-1.5">
                  <Label htmlFor="accord-autres" className="font-medium">
                    (Conditionnelle) Accord des autres adultes du ménage
                  </Label>
                  <p id="desc-accord-autres" className="text-sm text-muted-foreground">
                    Je confirme avoir obtenu l’accord explicite de tous les autres adultes composant le ménage et je m’engage à pouvoir fournir la preuve de cet accord sur demande.
                  </p>
                </div>
              </div>
            )}

            {/* Alerte info */}
            <div className="mt-1 rounded-lg border bg-muted/20 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5" aria-hidden />
                <p className="text-sm">
                  <span className="font-medium">Important —</span> Ces consentements sont obligatoires pour poursuivre la demande.
                </p>
              </div>
            </div>
          </div>

          {/* Séparateur */}
          <hr className="my-6 border-muted" />

          {/* Encadré optionnel : Recueillir par e-mail */}
          <div className="rounded-xl border p-4 bg-muted/20">
            <div className="flex items-start sm:items-center gap-3 sm:gap-4">
              <Checkbox
                id="collecte-email"
                checked={collecteEmail}
                onCheckedChange={(v) => setCollecteEmail(Boolean(v))}
                aria-describedby="desc-collecte-email"
              />
              <div className="flex-1 grid gap-1.5">
                <div className="flex items-center gap-2">
                  <Label htmlFor="collecte-email" className="font-medium">
                    Recueillir les consentements séparément par e-mail
                  </Label>
                  <Badge variant="outline">Optionnel</Badge>
                </div>
                <p id="desc-collecte-email" className="text-sm text-muted-foreground">
                  Cochez pour envoyer une demande de consentement par e-mail aux personnes concernées.
                </p>

                {collecteEmail && (
                  <div className="mt-3 grid gap-2 sm:flex sm:items-center">
                    <div className="grid gap-1.5 sm:w-80">
                      <Label htmlFor="email-consent" className="text-sm">Adresse e-mail</Label>
                      <Input
                        id="email-consent"
                        type="email"
                        inputMode="email"
                        placeholder="nom@exemple.ch"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        aria-describedby="help-email"
                      />
                      <p id="help-email" className="text-xs text-muted-foreground">
                        Non requis pour continuer — utilisé uniquement si vous activez l'envoi séparé.
                      </p>
                    </div>
                    <Button type="button" variant="secondary" className="gap-2 sm:self-end">
                      <Mail className="h-4 w-4" aria-hidden />
                      Préparer l'e-mail
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Erreurs */}
          {showErrors && errors.length > 0 && (
            <div className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4" role="alert" aria-live="assertive">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5" aria-hidden />
                <div>
                  <p className="font-medium">Veuillez corriger les éléments suivants :</p>
                  <ul className="list-disc pl-5 space-y-1 mt-2 text-sm">
                    {errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-end">
            {isValid && !submitting && (
              <div className="inline-flex items-center gap-1 text-sm text-green-700">
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                Prêt à enregistrer
              </div>
            )}
            <Button
              type="button"
              onClick={onSave}
              disabled={!isValid || submitting}
              className="gap-2"
            >
              <span>{submitting ? "Enregistrement…" : "Enregistrer et continuer"}</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.section>
  );
}
