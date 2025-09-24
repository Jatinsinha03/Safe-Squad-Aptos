import { AccountAddress, Hex } from "@aptos-labs/ts-sdk";
import { ValidationError } from "./errors";

export function validateAddress(address: string): string {
  try {
    return AccountAddress.from(address).toString();
  } catch (error) {
    throw new ValidationError(`Invalid address: ${address}`);
  }
}

export function validateAddresses(addresses: string[]): string[] {
  return addresses.map(validateAddress);
}

export function validateThreshold(threshold: number, membersCount: number): void {
  if (threshold <= 0) {
    throw new ValidationError("Threshold must be greater than 0");
  }
  if (threshold > membersCount) {
    throw new ValidationError("Threshold cannot exceed number of members");
  }
}

export function formatAmount(amount: string | number): string {
  if (typeof amount === "number") {
    return amount.toString();
  }
  return amount;
}