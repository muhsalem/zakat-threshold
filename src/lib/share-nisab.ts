export interface NisabValues {
  gold: number;
  silver: number;
  goldGram: number;
  silverGram: number;
  ratio: number;
  lower: number;
}
import { goldWeightFor } from "./nisab-valuation";

export function nisabSharePath(country: string, silverWeight = 595) {
  return `/country/${encodeURIComponent(country.toLowerCase())}${silverWeight === 612.36 ? "?silverWeight=612.36" : ""}`;
}
export function nisabShareMessage(input: {
  title: string;
  location: string;
  day: string;
  goldLabel: string;
  silverLabel: string;
  gold: string;
  silver: string;
  silverWeight: number;
  sources: string;
  note: string;
  url: string;
}) {
  return `${input.title} · ${input.location}\n${input.day} · UTC\n${input.goldLabel} (${goldWeightFor(input.silverWeight)}g · 24K): ${input.gold}\n${input.silverLabel} (${input.silverWeight}g): ${input.silver}\n${input.sources}\n${input.note}\n${input.url}`;
}
