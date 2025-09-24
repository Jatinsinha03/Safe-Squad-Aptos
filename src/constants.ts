export const DEFAULT_CONFIG = {
    MODULE_NAME: "squad_funds2",
    MAX_GAS_AMOUNT: 100000,
    GAS_UNIT_PRICE: 100,
    NETWORKS: {
      mainnet: "https://fullnode.mainnet.aptoslabs.com/v1",
      testnet: "https://fullnode.testnet.aptoslabs.com/v1",
      devnet: "https://fullnode.devnet.aptoslabs.com/v1",
      local: "http://localhost:8080/v1"
    }
  } as const;
  

  