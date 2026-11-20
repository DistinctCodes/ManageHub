import { request } from "@/lib/http";
import type { CurrencyMetadata } from "@/lib/utils";

interface CurrenciesResponse {
  currencies: CurrencyMetadata[];
}

export function getCurrencies(): Promise<CurrencyMetadata[]> {
  return request<CurrenciesResponse>("/currencies", {
    service: "currencies",
  }).then((response) => response.currencies ?? []);
}
