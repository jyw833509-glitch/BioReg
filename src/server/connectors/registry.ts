import type { Adapter } from "./shared/types";
import { fdaAdapter } from "./fda/sync";
import { config as emaConfig } from "./ema/config";
import { config as nmpaConfig } from "./nmpa/config";
import { config as cdeConfig } from "./cde/config";
import { config as ichConfig } from "./ich/config";
import * as emaParser from "./ema/parser";
import * as nmpaParser from "./nmpa/parser";
import * as cdeParser from "./cde/parser";
import * as ichParser from "./ich/parser";
import { normalize as emaNormalize } from "./ema/normalizer";
import { normalize as nmpaNormalize } from "./nmpa/normalizer";
import { normalize as cdeNormalize } from "./cde/normalizer";
import { normalize as ichNormalize } from "./ich/normalizer";
import { createClient as emaClient } from "./ema/client";
import { createClient as nmpaClient } from "./nmpa/client";
import { createClient as cdeClient } from "./cde/client";
import { createClient as ichClient } from "./ich/client";
import { config as pmdaConfig } from "./pmda/config";
import * as pmdaParser from "./pmda/parser";
import { normalize as pmdaNormalize } from "./pmda/normalizer";
import { createClient as pmdaClient } from "./pmda/client";
export const adapters: Record<string, Adapter> = { FDA: fdaAdapter };
for (const [config, parser, normalize, client] of [
  [emaConfig, emaParser, emaNormalize, emaClient],
  [nmpaConfig, nmpaParser, nmpaNormalize, nmpaClient],
  [cdeConfig, cdeParser, cdeNormalize, cdeClient],
  [ichConfig, ichParser, ichNormalize, ichClient],
  [pmdaConfig, pmdaParser, pmdaNormalize, pmdaClient],
] as const) {
  adapters[config.code] = {
    ...config,
    client: client(),
    parseList: parser.parseList,
    read: (html, url, candidate, source) =>
      normalize(parser.parseDetail(html, url, candidate, source)),
  };
}
