import SalesTax from "sales-tax";
import zipcodes from "zipcodes";

interface TaxResult {
  priceWithTax: string;
  taxRate: number;
}

export async function getEstimatedTax(
  zipCode: string,
  price: number
): Promise<TaxResult | null> {
  console.log(`[tax] Estimating tax for zipCode=${zipCode}, price=${price}`);
  const location = zipcodes.lookup(zipCode);
  if (!location || location.country !== "US") {
    console.log(`[tax] Invalid/non-US zip code. Location lookup:`, location);
    return null;
  }
  console.log(`[tax] Location: ${location.city}, ${location.state}`);

  const tax = await SalesTax.getSalesTax("US", location.state);
  console.log(`[tax] Tax rate for ${location.state}:`, tax);
  if (!tax || tax.rate === 0) return null;

  return {
    priceWithTax: (price * (1 + tax.rate)).toFixed(2),
    taxRate: tax.rate,
  };
}
