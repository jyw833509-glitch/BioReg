import { normalizeDocument } from "../shared/normalizer";
import type { Document } from "../shared/types";
import { mapType, mapStatus } from "./mapper";
export function normalize(doc: Document) {
  return normalizeDocument(doc, "CDE", mapType, mapStatus);
}
