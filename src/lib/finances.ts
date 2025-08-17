type PendingLater = {
  memberIndex: number;
  memberName: string;
  source: FinanceSource;
  sourceLabel: string;
  // Chemin dans le form pour cibler le champ concerné
  fieldPath: string;
  // Libellé lisible (pour UI / PDF)
  label: string;
};

function extractLaterFromFinances(
  members: any[] | undefined,
  finances: any[] | undefined
): PendingLater[] {
  if (!finances?.length) return [];
  const nameOf = (idx: number) => {
    const m = members?.[idx];
    return [m?.prenom, m?.nom].filter(Boolean).join(" ") || `Personne #${idx}`;
  };

  const list: PendingLater[] = [];

  finances.forEach((e, i) => {
    const source: FinanceSource = e?.source;
    if (!source) return;

    // 1) Bloc pièces commun (celui qui a le Switch "later")
    if (e?.pieces?.later === true) {
      list.push({
        memberIndex: e.memberIndex,
        memberName: nameOf(e.memberIndex),
        source,
        sourceLabel: SOURCE_LABEL[source],
        fieldPath: `finances[${i}].pieces`,
        label: "Justificatifs du revenu (bloc principal)"
      });
    }

    // 2) (Optionnel) Sous-justificatifs employeurs — ici il n’y a PAS de "later",
    // mais on peut remonter qu’il manque des fichiers si tu veux.
    // Si tu veux uniquement ce qui est explicitement "later", commente ce bloc.
    if (Array.isArray(e?.employeurs)) {
      e.employeurs.forEach((emp: any, j: number) => {
        const hasFiles = (emp?.justificatifs?.length || 0) > 0;
        if (!hasFiles) {
          list.push({
            memberIndex: e.memberIndex,
            memberName: nameOf(e.memberIndex),
            source,
            sourceLabel: SOURCE_LABEL[source],
            fieldPath: `finances[${i}].employeurs[${j}].justificatifs`,
            label: `Justificatifs employeur #${j + 1}`
          });
        }
      });
    }
  });

  return list;
}
