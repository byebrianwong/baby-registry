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
  const location = zipcodes.lookup(zipCode);
  if (!location || location.country !== "US") return null;

  const tax = await SalesTax.getSalesTax("US", location.state);
  if (!tax || tax.rate === 0) return null;

  return {
    priceWithTax: (price * (1 + tax.rate)).toFixed(2),
    taxRate: tax.rate,
  };
}
