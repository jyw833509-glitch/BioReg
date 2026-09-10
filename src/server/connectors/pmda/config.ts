export const config = {
  code: "PMDA" as const,
  embeddedDocuments: true,
  hosts: ["www.pmda.go.jp"],
  pages: ["0005", "0003"].map(
    (id) => `https://www.pmda.go.jp/english/review-services/reviews/${id}.html`,
  ),
};
