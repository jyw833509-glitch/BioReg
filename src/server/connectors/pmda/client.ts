import { OfficialClient } from "../shared/client";
import { officialUrl } from "../shared/url";
import { config } from "./config";
export function createClient() {
  return new OfficialClient((url, base) =>
    officialUrl(url, base || config.pages[0], config.hosts),
  );
}
