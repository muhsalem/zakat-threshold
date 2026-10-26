import { createServerFn } from "@tanstack/react-start";

import type { NisabStandard } from "./nisab-at";
import type { NisabLookup } from "./nisab-lookup.server";

type Input = { country: string; at: string; standard: NisabStandard };

/** The nisab of a country at a past instant (see lookupNisabAt for how it is found). */
export const getNisabAt = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown): Input => {
    const v = (raw ?? {}) as Partial<Input>;
    return {
      country: String(v.country ?? "")
        .slice(0, 2)
        .toUpperCase(),
      at: String(v.at ?? "").slice(0, 40),
      standard: v.standard === "tola" ? "tola" : "default",
    };
  })
  .handler(async ({ data }): Promise<NisabLookup> => {
    const { lookupNisabAt } = await import("./nisab-lookup.server");
    try {
      return await lookupNisabAt(data.country, data.at, data.standard);
    } catch {
      return { found: false, reason: "unavailable" };
    }
  });
