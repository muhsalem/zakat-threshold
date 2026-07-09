import { describe, expect, it } from "vitest";
import {
  calcAnimalProductionZakat,
  calcCryptoMiningZakat,
  calcFisheriesZakat,
  calcIntellectualPropertyZakat,
} from "./zakatExtended";

describe("calcCryptoMiningZakat", () => {
  it("applies 2.5% trade rate on mined + cash minus costs", () => {
    const r = calcCryptoMiningZakat({
      minedValueAtHawl: 10000,
      cashFromSales: 5000,
      operatingCosts: 3000,
    });
    expect(r.base).toBe(12000);
    expect(r.zakat).toBe(300);
    expect(r.rate).toBe(0.025);
  });

  it("applies 10% yield rate when method=yield", () => {
    const r = calcCryptoMiningZakat({
      minedValueAtHawl: 0,
      cashFromSales: 8000,
      operatingCosts: 3000,
      method: "yield",
    });
    expect(r.base).toBe(5000);
    expect(r.zakat).toBe(500);
    expect(r.rate).toBe(0.1);
  });

  it("clamps negative bases to zero", () => {
    const r = calcCryptoMiningZakat({
      minedValueAtHawl: 100,
      cashFromSales: 0,
      operatingCosts: 999999,
    });
    expect(r.base).toBe(0);
    expect(r.zakat).toBe(0);
  });

  it("ignores non-finite inputs", () => {
    const r = calcCryptoMiningZakat({
      minedValueAtHawl: Number.NaN,
      cashFromSales: 1000,
      operatingCosts: 200,
    });
    expect(r.base).toBe(800);
  });
});

describe("calcFisheriesZakat", () => {
  it("returns zero for non-trade fisheries", () => {
    const r = calcFisheriesZakat({
      inventoryMarketValue: 50000,
      cashAndReceivables: 0,
      operatingPayables: 0,
      isForTrade: false,
    });
    expect(r.zakat).toBe(0);
    expect(r.rate).toBe(0);
  });

  it("applies 2.5% trade rate when isForTrade", () => {
    const r = calcFisheriesZakat({
      inventoryMarketValue: 40000,
      cashAndReceivables: 10000,
      operatingPayables: 5000,
    });
    expect(r.base).toBe(45000);
    expect(r.zakat).toBe(1125);
  });
});

describe("calcAnimalProductionZakat", () => {
  it("sums herd + products + cash minus payables", () => {
    const r = calcAnimalProductionZakat({
      herdMarketValue: 100000,
      productsInventory: 20000,
      cashAndReceivables: 15000,
      operatingPayables: 25000,
    });
    expect(r.base).toBe(110000);
    expect(r.zakat).toBe(2750);
    expect(r.rate).toBe(0.025);
  });
});

describe("calcIntellectualPropertyZakat", () => {
  it("trade mode: 2.5% of asset market value", () => {
    const r = calcIntellectualPropertyZakat({ mode: "trade", assetMarketValue: 200000 });
    expect(r.zakat).toBe(5000);
  });

  it("royalty mode: 2.5% of royalties received", () => {
    const r = calcIntellectualPropertyZakat({ mode: "royalty", royaltiesReceived: 40000 });
    expect(r.zakat).toBe(1000);
  });

  it("yield mode: 10% of net royalties (after costs)", () => {
    const r = calcIntellectualPropertyZakat({
      mode: "yield",
      royaltiesReceived: 50000,
      managementCosts: 10000,
    });
    expect(r.base).toBe(40000);
    expect(r.zakat).toBe(4000);
    expect(r.rate).toBe(0.1);
  });
});
