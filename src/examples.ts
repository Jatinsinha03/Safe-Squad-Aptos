
// File: src/examples.ts
import { Account, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";
import { SquadFundsClient } from "./client";

// Example usage
async function exampleUsage() {
  // Initialize the SDK
  const client = new SquadFundsClient({
    moduleAddress: "0x6bac68c081f0d90d947c211c9b43634b74303ea36ff13bc15c109857c0516e2d",
    moduleName: "squad_funds2",
    network: "testnet"
  });


  

  // Create accounts (in real usage, you'd load from private keys / .env)
  const creator = Account.fromPrivateKey({
    privateKey: new Ed25519PrivateKey(
      "0xb501603316f3606d0edd7331c7209c930907b2f6ff0fd4f643ef544437c61698"
    ),
  });

  

  console.log("Creator address:", creator.accountAddress.toString());
  try {
    const squadConfig = {
      members: [
        creator.accountAddress.toString(),
        "0x93a1baca90f8b746eec77d2c3a3b63dc2d46c8ae612c2badd2760c4e2c0be20e",
        "0x7349cf901abcfa101215344ff1f77c03b5537d5971d02a541de983a56a34f319",
      ],
      threshold: 1,
    };

    // ✅ Check before creating
    const squadExists = await client.squadExists(
      creator.accountAddress.toString()
    );

    if (!squadExists) {
      const createTx = await client.createSquad(creator, squadConfig);
      console.log("Squad created:", createTx.hash);
    } else {
      console.log("Squad already exists, skipping createSquad");
    }

    // Get squad info
    const squad = await client.getSquad(creator.accountAddress.toString());
    console.log("Squad info:", squad);

    // Deposit funds
    const depositTx = await client.deposit(creator, "1000000"); // 0.01 APT
    console.log("Deposit transaction:", depositTx.hash);

    // Propose a transfer
    const proposeTx = await client.proposeTransfer(
      creator,
      "0x93a1baca90f8b746eec77d2c3a3b63dc2d46c8ae612c2badd2760c4e2c0be20e",
      "500000"
    );
    console.log("Proposal transaction:", proposeTx.hash);

    // Approve the proposal (proposal ID 0)
    const approveTx = await client.approve(creator, 0);
    console.log("Approval transaction:", approveTx.hash);

    // Execute the proposal
    const executeTx = await client.execute(creator, 0);
    console.log("Execute transaction:", executeTx.hash);
  } catch (error) {
    console.error("Error:", error);
  }
}

// Export the example for reference
export { exampleUsage };

// Run the example directly
exampleUsage();
