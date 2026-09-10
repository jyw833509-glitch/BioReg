import type { Prisma } from "../generated/prisma/client";
export function officialOnly() {
  return (
    process.env.NODE_ENV === "production" &&
    process.env.BIOREG_INCLUDE_MOCK_DATA !== "true"
  );
}
export function visibleWhere(
  where: Prisma.RegulationWhereInput = {},
): Prisma.RegulationWhereInput {
  return officialOnly() ? { AND: [where, { is_mock: false }] } : where;
}
