import { Account, Ed25519PrivateKey, Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { SquadFundsClient } from "../../../dist";

// Original SDK client for read operations
export const client = new SquadFundsClient({
    moduleAddress: "0x6bac68c081f0d90d947c211c9b43634b74303ea36ff13bc15c109857c0516e2d",
    moduleName: "squad_funds2",
    network: "testnet",
});

// Custom Petra wallet client for write operations
export class PetraWalletClient {
  private aptos: Aptos;
  private moduleAddress: string;
  private moduleName: string;

  constructor() {
    this.moduleAddress = "0x6bac68c081f0d90d947c211c9b43634b74303ea36ff13bc15c109857c0516e2d";
    this.moduleName = "squad_funds2";
    
    // Setup Aptos client for read operations
    const aptosConfig = new AptosConfig({
      network: Network.TESTNET,
    });
    this.aptos = new Aptos(aptosConfig);
  }

  // Check Petra wallet network
  async checkNetwork(): Promise<string> {
    if (typeof window === 'undefined' || !window.aptos) {
      throw new Error('Petra wallet not available');
    }

    try {
      // Try different methods to get network
      if (window.aptos.network) {
        return await window.aptos.network();
      } else if (window.aptos.getNetwork) {
        return await window.aptos.getNetwork();
      } else {
        console.log('Network method not available, assuming testnet');
        return 'testnet';
      }
    } catch (error) {
      console.log('Error getting network:', error);
      return 'testnet';
    }
  }

  // Helper method to build function name
  private getFunctionName(functionName: string): string {
    return `${this.moduleAddress}::${this.moduleName}::${functionName}`;
  }

  // Create squad with Petra wallet
  async createSquad(members: string[], threshold: number): Promise<any> {
    if (typeof window === 'undefined' || !window.aptos) {
      throw new Error('Petra wallet not available');
    }

    const transactionPayload = {
      type: "entry_function_payload",
      function: this.getFunctionName("create_squad"),
      arguments: [members, threshold],
      type_arguments: [],
    };

    console.log('Creating squad with payload:', transactionPayload);
    const response = await window.aptos.signAndSubmitTransaction(transactionPayload);
    console.log('Squad creation response:', response);
    return response;
  }

  // Deposit with Petra wallet
  async deposit(amount: string): Promise<any> {
    if (typeof window === 'undefined' || !window.aptos) {
      throw new Error('Petra wallet not available');
    }

    try {
      // Check network first
      const network = await this.checkNetwork();
      console.log('Petra wallet network:', network);

      const transactionPayload = {
        type: "entry_function_payload",
        function: this.getFunctionName("deposit"),
        arguments: [amount],
        type_arguments: [],
      };

      console.log('Depositing with payload:', transactionPayload);
      console.log('Petra wallet available:', !!window.aptos);
      console.log('Petra wallet methods:', Object.keys(window.aptos));
      
      // Check if account is connected
      const isConnected = await window.aptos.isConnected();
      console.log('Petra wallet connected:', isConnected);
      
      if (!isConnected) {
        throw new Error('Petra wallet not connected');
      }

      const account = await window.aptos.account();
      console.log('Petra wallet account:', account);
      
      const response = await window.aptos.signAndSubmitTransaction(transactionPayload);
      console.log('Deposit response:', response);
      
      // Wait for transaction to be processed
      if (response.hash) {
        console.log('Transaction hash:', response.hash);
        console.log('Transaction URL:', `https://explorer.aptoslabs.com/txn/${response.hash}?network=${network}`);
      }
      
      return response;
    } catch (error) {
      console.error('Deposit error:', error);
      throw error;
    }
  }

  // Propose transfer with Petra wallet
  async proposeTransfer(to: string, amount: string): Promise<any> {
    if (typeof window === 'undefined' || !window.aptos) {
      throw new Error('Petra wallet not available');
    }

    const transactionPayload = {
      type: "entry_function_payload",
      function: this.getFunctionName("propose_transfer"),
      arguments: [to, amount],
      type_arguments: [],
    };

    return await window.aptos.signAndSubmitTransaction(transactionPayload);
  }

  // Approve proposal with Petra wallet
  async approve(proposalId: number): Promise<any> {
    if (typeof window === 'undefined' || !window.aptos) {
      throw new Error('Petra wallet not available');
    }

    const transactionPayload = {
      type: "entry_function_payload",
      function: this.getFunctionName("approve"),
      arguments: [proposalId],
      type_arguments: [],
    };

    return await window.aptos.signAndSubmitTransaction(transactionPayload);
  }

  // Execute proposal with Petra wallet
  async execute(proposalId: number): Promise<any> {
    if (typeof window === 'undefined' || !window.aptos) {
      throw new Error('Petra wallet not available');
    }

    const transactionPayload = {
      type: "entry_function_payload",
      function: this.getFunctionName("execute"),
      arguments: [proposalId],
      type_arguments: [],
    };

    return await window.aptos.signAndSubmitTransaction(transactionPayload);
  }

  // Test function to verify Petra wallet is working
  async testPetraWallet(): Promise<any> {
    if (typeof window === 'undefined' || !window.aptos) {
      throw new Error('Petra wallet not available');
    }

    try {
      console.log('Testing Petra wallet...');
      
      // Check if connected
      const isConnected = await window.aptos.isConnected();
      console.log('Petra wallet connected:', isConnected);
      
      if (!isConnected) {
        throw new Error('Petra wallet not connected');
      }

      // Get account info
      const account = await window.aptos.account();
      console.log('Petra wallet account:', account);
      
      // Check network
      const network = await this.checkNetwork();
      console.log('Petra wallet network:', network);
      
      // Test a simple transaction (transfer 1 octa to self)
      const testPayload = {
        type: "entry_function_payload",
        function: "0x1::aptos_account::transfer",
        arguments: [account.address, "1"], // Transfer 1 octa to self
        type_arguments: [],
      };

      console.log('Test transaction payload:', testPayload);
      const response = await window.aptos.signAndSubmitTransaction(testPayload);
      console.log('Test transaction response:', response);
      
      return response;
    } catch (error) {
      console.error('Petra wallet test error:', error);
      throw error;
    }
  }
}

// Export the Petra wallet client
export const petraClient = new PetraWalletClient();