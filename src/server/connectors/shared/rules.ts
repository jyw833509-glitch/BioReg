// Reviewed deterministic rules; extend here without changing parser or database code.
export const relevanceRules = {
  biological:
    /\b(biologics?|biological products?|therapeutic proteins?|monoclonal antibod\w*|bispecific antibod\w*|biosimilars?|recombinant proteins?|vaccines?|cell(?:ular)? therap\w*|gene therap\w*|immunogenicity|viral safety)\b/i,
  center:
    /\b(CBER|CDER)\b|Center for (Biologics|Drug) Evaluation and Research/i,
  shared:
    /\b(CMC|manufacturing|quality|analytical|stability|clinical|pharmacovigilance|regulatory|PDUFA)\b/i,
};
export function classify(
  title: string,
  summary: string,
  offices: string[],
  context: string,
) {
  const text = `${title} ${summary}`;
  const center = relevanceRules.center.test(offices.join(" ") + " " + context);
  const relevant =
    relevanceRules.biological.test(text) ||
    (center && relevanceRules.shared.test(text)) ||
    /CBER|Center for Biologics/.test(offices.join(" ") + context);
  const categories: string[] = [];
  const product_types: string[] = [];
  const development_stages: string[] = [];
  const affected_departments: string[] = [];
  if (
    /\b(CMC|manufacturing|analytical|stability|quality|container closure)\b/i.test(
      text,
    )
  ) {
    categories.push("CMC / Quality");
    affected_departments.push("CMC", "QA");
  }
  if (/\bclinical\b/i.test(text)) {
    categories.push("Clinical");
    affected_departments.push("Clinical");
  }
  if (/pharmacovigilance|postapproval|postmarketing/i.test(text)) {
    categories.push("Post-Approval");
    development_stages.push("Post Approval");
  }
  if (/gene therap/i.test(text)) product_types.push("Gene Therapy");
  if (/cell(?:ular)? therap/i.test(text)) product_types.push("Cell Therapy");
  if (/biosimilar/i.test(text)) product_types.push("Biosimilar");
  if (/vaccin/i.test(text)) product_types.push("Vaccine");
  if (/monoclonal antibod/i.test(text))
    product_types.push("Monoclonal Antibody");
  return {
    relevant,
    categories,
    product_types,
    development_stages,
    affected_departments,
  };
}
