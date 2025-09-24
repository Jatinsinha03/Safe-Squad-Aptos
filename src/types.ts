import { AccountAddress } from "@aptos-labs/ts-sdk";

export interface SquadConfig {
  members: string[];
  threshold: number;
}

export interface Squad {
  members: string[];
  threshold: number;
  balance: string;
  nextProposalId: number;
}

export interface Proposal {
  id: number;
  to: string;
  amount: string;
  approvals: string[];
  executed: boolean;
}

export interface TransactionOptions {
  maxGasAmount?: number;
  gasUnitPrice?: number;
}

export interface SquadFundsSDKConfig {
  moduleAddress: string;
  moduleName?: string;
  network?: "mainnet" | "testnet" | "devnet" | "local";
  nodeUrl?: string;
}