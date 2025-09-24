import {
    Aptos,
    AptosConfig,
    Network,
    Account,
    AccountAddress,
    InputEntryFunctionData,
    PendingTransactionResponse,
    UserTransactionResponse,
    MoveStructType,
    MoveValue
  } from "@aptos-labs/ts-sdk";
  
  import { SquadFundsSDKConfig, Squad, Proposal, TransactionOptions, SquadConfig } from "./types";
  import { DEFAULT_CONFIG } from "./constants";
  import { SquadFundsError, TransactionError, ValidationError } from "./errors";
  import { validateAddress, validateAddresses, validateThreshold, formatAmount } from "./utils";
  
  export class SquadFundsClient {
    private aptos: Aptos;
    private moduleAddress: string;
    private moduleName: string;
  
    constructor(config: SquadFundsSDKConfig) {
      this.moduleAddress = config.moduleAddress;
      this.moduleName = config.moduleName || DEFAULT_CONFIG.MODULE_NAME;
  
      // Setup Aptos client
      const nodeUrl = config.nodeUrl || (config.network ? DEFAULT_CONFIG.NETWORKS[config.network] : DEFAULT_CONFIG.NETWORKS.devnet);
      const aptosConfig = new AptosConfig({
        network: config.network as Network,   // let SDK know it’s testnet/devnet/mainnet
        fullnode: nodeUrl                     // optional override
      });
      
      this.aptos = new Aptos(aptosConfig);
    }
  
    // Helper method to build function name
private getFunctionName(functionName: string): `${string}::${string}::${string}` {
    return `${this.moduleAddress}::${this.moduleName}::${functionName}`;
  }
  
  
    // Create squad with vector of addresses
    async createSquad(
        account: Account,
        config: SquadConfig,
        options?: TransactionOptions
      ): Promise<UserTransactionResponse> {
        try {
          if (config.members.length !== 3) {
            throw new ValidationError(
              `createSquad currently supports exactly 3 members, received ${config.members.length}`
            );
          }
          // Delegate to the entry that works on-chain
          return await this.createSquadWithAddresses(
            account,
            config.members[0],
            config.members[1],
            config.members[2],
            config.threshold,
            options
          );
        } catch (error) {
          throw new TransactionError(
            `Failed to create squad: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
      
      
      
  
    // Create squad with individual addresses (for CLI compatibility)
    async createSquadWithAddresses(
        account: Account,
        member1: string,
        member2: string,
        member3: string,
        threshold: number,
        options?: TransactionOptions
      ): Promise<UserTransactionResponse> {
        try {
          const validatedMembers = validateAddresses([member1, member2, member3]);
          validateThreshold(threshold, 3);
      
          const transaction: InputEntryFunctionData = {
            function: this.getFunctionName("create_squad_with_addresses"),
            typeArguments: [],
            functionArguments: [
              validatedMembers[0],
              validatedMembers[1],
              validatedMembers[2],
              threshold,
            ],
          };
      
          // 1. Build raw transaction
          const pendingTx = await this.aptos.transaction.build.simple({
            sender: account.accountAddress,
            data: transaction,
            options: {
              maxGasAmount:
                options?.maxGasAmount || DEFAULT_CONFIG.MAX_GAS_AMOUNT,
              gasUnitPrice:
                options?.gasUnitPrice || DEFAULT_CONFIG.GAS_UNIT_PRICE,
            },
          });
      
          // 2. Sign raw transaction -> authenticator
          const senderAuthenticator = this.aptos.transaction.sign({
            signer: account,
            transaction: pendingTx,
          });
      
          // 3. Submit raw transaction + authenticator
          const response = await this.aptos.transaction.submit.simple({
            transaction: pendingTx,
            senderAuthenticator,
          });
      
          // 4. Wait for confirmation
          return (await this.aptos.waitForTransaction({
            transactionHash: response.hash,
          })) as UserTransactionResponse;
        } catch (error) {
          throw new TransactionError(
            `Failed to create squad: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
      
  
    // Deposit APT into squad
    async deposit(
        account: Account,
        amount: string | number,
        options?: TransactionOptions
      ): Promise<UserTransactionResponse> {
        try {
          const formattedAmount = formatAmount(amount);
      
          const transaction: InputEntryFunctionData = {
            function: this.getFunctionName("deposit"),
            typeArguments: [],
            functionArguments: [formattedAmount],
          };
      
          const pendingTx = await this.aptos.transaction.build.simple({
            sender: account.accountAddress,
            data: transaction,
            options: {
              maxGasAmount: options?.maxGasAmount || DEFAULT_CONFIG.MAX_GAS_AMOUNT,
              gasUnitPrice: options?.gasUnitPrice || DEFAULT_CONFIG.GAS_UNIT_PRICE,
            },
          });
      
          const senderAuthenticator = this.aptos.transaction.sign({
            signer: account,
            transaction: pendingTx,
          });
      
          const response = await this.aptos.transaction.submit.simple({
            transaction: pendingTx,
            senderAuthenticator,
          });
      
          return (await this.aptos.waitForTransaction({
            transactionHash: response.hash,
          })) as UserTransactionResponse;
        } catch (error) {
          throw new TransactionError(
            `Failed to deposit: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
      
  
    // Propose a transfer
    async proposeTransfer(
        account: Account,
        to: string,
        amount: string | number,
        options?: TransactionOptions
      ): Promise<UserTransactionResponse> {
        try {
          const validatedTo = validateAddress(to);
          const formattedAmount = formatAmount(amount);
      
          const transaction: InputEntryFunctionData = {
            function: this.getFunctionName("propose_transfer"),
            typeArguments: [],
            functionArguments: [validatedTo, formattedAmount],
          };
      
          const pendingTx = await this.aptos.transaction.build.simple({
            sender: account.accountAddress,
            data: transaction,
            options: {
              maxGasAmount: options?.maxGasAmount || DEFAULT_CONFIG.MAX_GAS_AMOUNT,
              gasUnitPrice: options?.gasUnitPrice || DEFAULT_CONFIG.GAS_UNIT_PRICE,
            },
          });
      
          const senderAuthenticator = this.aptos.transaction.sign({
            signer: account,
            transaction: pendingTx,
          });
      
          const response = await this.aptos.transaction.submit.simple({
            transaction: pendingTx,
            senderAuthenticator,
          });
      
          return (await this.aptos.waitForTransaction({
            transactionHash: response.hash,
          })) as UserTransactionResponse;
        } catch (error) {
          throw new TransactionError(
            `Failed to propose transfer: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
      
  
    // Approve a proposal
    async approve(
        account: Account,
        proposalId: number,
        options?: TransactionOptions
      ): Promise<UserTransactionResponse> {
        const transaction: InputEntryFunctionData = {
          function: this.getFunctionName("approve"),
          typeArguments: [],
          functionArguments: [proposalId],
        };
      
        const pendingTx = await this.aptos.transaction.build.simple({
          sender: account.accountAddress,
          data: transaction,
          options: {
            maxGasAmount: options?.maxGasAmount || DEFAULT_CONFIG.MAX_GAS_AMOUNT,
            gasUnitPrice: options?.gasUnitPrice || DEFAULT_CONFIG.GAS_UNIT_PRICE,
          },
        });
      
        const senderAuthenticator = this.aptos.transaction.sign({
          signer: account,
          transaction: pendingTx,
        });
      
        const response = await this.aptos.transaction.submit.simple({
          transaction: pendingTx,
          senderAuthenticator,
        });
      
        return (await this.aptos.waitForTransaction({
          transactionHash: response.hash,
        })) as UserTransactionResponse;
      }
      
  
    // Execute a proposal
    async execute(
      account: Account,
      proposalId: number,
      options?: TransactionOptions
    ): Promise<UserTransactionResponse> {
      const transaction: InputEntryFunctionData = {
        function: this.getFunctionName("execute"), // <-- was "approve"
        typeArguments: [],
        functionArguments: [proposalId],
      };
    
      const pendingTx = await this.aptos.transaction.build.simple({
        sender: account.accountAddress,
        data: transaction,
        options: {
          maxGasAmount: options?.maxGasAmount || DEFAULT_CONFIG.MAX_GAS_AMOUNT,
          gasUnitPrice: options?.gasUnitPrice || DEFAULT_CONFIG.GAS_UNIT_PRICE,
        },
      });
    
      const senderAuthenticator = this.aptos.transaction.sign({
        signer: account,
        transaction: pendingTx,
      });
    
      const response = await this.aptos.transaction.submit.simple({
        transaction: pendingTx,
        senderAuthenticator,
      });
    
      return (await this.aptos.waitForTransaction({
        transactionHash: response.hash,
      })) as UserTransactionResponse;
    }
    
      
  
      async getSquad(squadAddress: string): Promise<Squad | null> {
        try {
          const validatedAddress = validateAddress(squadAddress);
      
          const resourceType =
            `${this.moduleAddress}::${this.moduleName}::Squad` as `${string}::${string}::${string}`;
      
          // First, try direct fetch
          const direct = await this.aptos.getAccountResource({
            accountAddress: validatedAddress,
            resourceType,
          });
      
          let data: any | undefined = (direct as any)?.data;
      
          // Fallback: list all resources and find by type (some fullnodes occasionally fail the direct endpoint)
          if (!data) {
            const all = await this.aptos.getAccountResources({ accountAddress: validatedAddress });
            const hit = (all as any[] | undefined)?.find((r: any) => r?.type === resourceType);
            data = hit?.data;
          }
      
          if (!data) {
            // Nothing on-chain
            return null;
          }
      
          // Parse robustly
          return {
            members: Array.isArray(data.members) ? data.members.map((m: any) => m.toString()) : [],
            threshold: Number(data.threshold ?? 0),
            balance: (data.balance?.value ?? "0").toString(),
            nextProposalId: Number(data.next_proposal_id ?? 0),
          };
        } catch (error) {
          if (error instanceof Error && error.message.includes("Resource not found")) {
            return null;
          }
          throw new SquadFundsError(
            `Failed to get squad: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
      
      
      
    // Check if squad exists
    async squadExists(squadAddress: string): Promise<boolean> {
      const squad = await this.getSquad(squadAddress);
      return squad !== null;
    }
  
    // Get account's APT balance
    async getBalance(address: string): Promise<string> {
      try {
        const validatedAddress = validateAddress(address);
        const balance = await this.aptos.getAccountAPTAmount({
          accountAddress: validatedAddress
        });
        return balance.toString();
      } catch (error) {
        throw new SquadFundsError(
          `Failed to get balance: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }