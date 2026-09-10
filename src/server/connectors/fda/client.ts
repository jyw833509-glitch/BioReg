import { OfficialClient } from "../shared/client";
import { canonicalUrl } from "./parser";
export type { HtmlClient } from "../shared/client";
export class FdaClient extends OfficialClient {
  constructor(delay = 1200, timeout = 20000, retries = 2) {
    super(canonicalUrl, delay, timeout, retries);
  }
}
