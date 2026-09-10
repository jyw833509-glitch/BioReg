export const config = {
  code: "ICH" as const,
  embeddedDocuments: true,
  hosts: ["www.ich.org", "ich.org", "admin.ich.org", "database.ich.org"],
  pages: ["quality", "safety", "efficacy", "multidisciplinary"].map(
    (s) =>
      `https://admin.ich.org/api/v1/nodes?loadEntities%5B%5D=paragraph&alias=%2Fpage%2F${s}-guidelines`,
  ),
};
