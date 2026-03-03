"use server";

import { getEstimatedTax } from "@/lib/tax";

export async function estimateTax(zipCode: string, price: number) {
  return getEstimatedTax(zipCode, price);
}
