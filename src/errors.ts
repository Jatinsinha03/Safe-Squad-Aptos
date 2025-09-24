export class SquadFundsError extends Error {
    constructor(message: string, public code?: string) {
      super(message);
      this.name = "SquadFundsError";
    }
  }
  
  export class TransactionError extends SquadFundsError {
    constructor(message: string, public transactionHash?: string) {
      super(message, "TRANSACTION_ERROR");
    }
  }
  
  export class ValidationError extends SquadFundsError {
    constructor(message: string) {
      super(message, "VALIDATION_ERROR");
    }
  }