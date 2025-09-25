# 🛡️ Safe Squad - Decentralized Multi-Signature Treasury Management (Track: Payments & RWA)( [Video](https://youtu.be/HA_1sQnSkT4))

> **Revolutionary Payments platform for secure, collaborative fund management on Aptos blockchain**

---

## 🚨 **The Problem We're Solving**

Traditional fund management in collaborative projects faces critical challenges:

### **Centralized Treasury Control is Risky**
- **Single point of failure**: One person controls all funds
- **Security vulnerabilities**: Compromised accounts lead to total loss
- **Power concentration**: Unequal control distribution among team members

### **Lack of Transparency in Fund Usage**
- **Hidden transactions**: No visibility into how funds are spent
- **Audit difficulties**: Hard to track and verify fund movements
- **Accountability gaps**: No clear record of who authorized what

### **Slow & Inefficient Approval Processes**
- **Manual workflows**: Email chains and meetings for every transaction
- **Bottlenecks**: Single approver delays entire processes
- **Coordination overhead**: Complex multi-step approval chains

### **Trust Issues in Shared Projects**
- **Misaligned incentives**: Different stakeholders have conflicting interests
- **Communication breakdowns**: Misunderstandings about fund usage
- **Relationship strain**: Financial disputes damage team dynamics

### **No Easy Way to Manage Joint Funds in Web3**
- **Technical barriers**: Complex smart contract interactions
- **User experience**: Cryptocurrency management is intimidating
- **Integration challenges**: Difficult to connect with existing workflows

---

## 🚀 **What is Safe Squad?**

**Safe Squad** is a cutting-edge decentralized application (dApp) that enables squads, organizations, and communities to collaboratively manage shared treasuries through **multi-signature (multisig) technology** on the Aptos blockchain. Think of it as a "shared bank account" where multiple people must approve transactions before they can be executed.

### 🎯 **Core Concept**
Instead of trusting a single person with funds, Safe Squad distributes control among multiple trusted parties. This ensures that no single individual can unilaterally spend from the treasury, providing enhanced security and governance for collaborative projects.

---

## ✨ **Key Features**

### 🔐 **Multi-Signature Security**
- **Threshold-based approvals**: Set custom approval requirements (e.g., 3 out of 5 members must approve)
- **Distributed control**: No single point of failure
- **Transparent governance**: All proposals and approvals are recorded on-chain

### 👥 **Squad Formation & Management**
- **Invite-based onboarding**: Seamless squad building with email invitations
- **Creator privileges**: Squad creators automatically become the first member
- **Flexible squad sizes**: Support for any number of squad members
- **Real-time collaboration**: Instant updates when members join or leave

### 💰 **Treasury Management**
- **Secure deposits**: Add funds to shared treasury with 0.01 APT minimum
- **Proposal system**: Any member can propose fund transfers
- **Approval workflow**: Multi-step approval process for all transactions
- **Balance tracking**: Real-time treasury and personal balance monitoring


### 🔗 **Blockchain Integration**
- **Aptos testnet**: Deployed on Aptos blockchain for fast, secure transactions
- **Smart contract automation**: Automated execution of approved proposals
- **Transaction transparency**: All activities visible on Aptos Explorer
- **Timely transactions**: 2-minute transaction validity window for enhanced security

---

## 📋 **Smart Contract Details**

### **Contract Address**
```
0x6bac68c081f0d90d947c211c9b43634b74303ea36ff13bc15c109857c0516e2d
```

### **Module Name**
```
squad_funds2
```

### **Network**
```
Aptos Testnet
```

### **Key Functions**
- `create_squad(members, threshold)` - Create new multisig squad
- `deposit(amount)` - Add funds to treasury
- `propose_transfer(to, amount)` - Propose fund transfer
- `approve(proposal_id)` - Approve pending proposal
- `execute(proposal_id)` - Execute approved proposal

---

## 🌟 **What Makes Safe Squad Unique?**

### 🛡️ **1. Enhanced Security Model**
- **Threshold flexibility**: Custom approval requirements per squad
- **Proposal lifecycle**: Complete audit trail of all decisions
- **Multi-layer validation**: Both smart contract and UI-level checks
- **Timely transactions**: 2-minute validity window prevents stale transaction attacks

### 🚀 **2. Aptos-Native Innovation**
- **Built for Aptos**: Optimized for Aptos blockchain capabilities
- **Petra wallet integration**: Native wallet experience
- **Gas efficiency**: Leveraging Aptos's low transaction costs
- **Future-proof**: Ready for Aptos mainnet deployment

---

## 🎮 **How It Works**

### **Step 1: Form squad**
1. Connect your Petra wallet
2. Set squad size and approval threshold
3. Invite squad members via email

### **Step 2: squad Completion**
1. Invited members accept invitations
2. Squad creator reviews squad composition
3. Convert completed squad to on-chain squad

### **Step 3: Treasury Management**
1. **Deposit**: Add funds to shared treasury
2. **Propose**: Any member can propose transfers
3. **Approve**: Members vote on proposals
4. **Execute**: Approved proposals are automatically executed

---

## 🏆 **Use Cases**

### **👨‍💼 Business & Organizations**
- **Company treasuries**: Multi-department fund management
- **Project budgets**: Collaborative spending oversight
- **Vendor payments**: Streamlined approval workflows

### **🎓 Educational & Research**
- **Research grants**: Multi-investigator fund management
- **Student organizations**: Transparent budget allocation
- **Academic projects**: Collaborative resource sharing
  
---

## 🔮 **Future Roadmap**

### **Phase 1: Core Features** ✅
- [x] Multi-signature squad creation
- [x] squad invitation system
- [x] Treasury management
- [x] Proposal and approval workflow

### **Phase 2: Enhanced Features** 🚧
- [ ] Advanced proposal types (NFT purchases, Payments interactions)
- [ ] Time-locked proposals
- [ ] Member role management
- [ ] Treasury analytics dashboard

### **Phase 3: Ecosystem Integration** 🔮
- [ ] Integration with other Aptos dApps
- [ ] Cross-chain bridge support
- [ ] Mobile app development
- [ ] Enterprise features

---

## 🛠️ **Technology Stack**

- **Frontend**: Next.js 15, React, TypeScript
- **Blockchain**: Aptos blockchain (testnet)
- **Wallet**: Petra wallet integration
- **SDK**: Custom Aptos SDK for squad operations
- **Styling**: Inline CSS with glass morphism
- **Authentication**: Google Sign-In with NextAuth
- **Database**: Prisma with SQLite
- **Deployment**: Vercel-ready

---

## 📦 **SDK Integration**

Safe Squad provides a **custom Aptos SDK** that developers can use to integrate squad functionality into their own applications:

### **SDK Features**
- **SquadFundsClient**: Core SDK for squad operations
- **PetraWalletClient**: Custom wallet integration for transactions
- **TypeScript Support**: Full type safety and IntelliSense
- **Network Management**: Automatic testnet/mainnet handling
- **Transaction Building**: Pre-built transaction payloads
- **Timely Transactions**: Built-in 2-minute transaction validity

### **SDK Usage**
```typescript
import { SquadFundsClient, PetraWalletClient } from '@safe-squad/sdk';

// Initialize SDK client
const client = new SquadFundsClient({
  moduleAddress: "0x6bac68c081f0d90d947c211c9b43634b74303ea36ff13bc15c109857c0516e2d",
  moduleName: "squad_funds2",
  network: "testnet"
});

// Create squad with SDK
const squad = await client.createSquad(members, threshold);

// Deposit funds
await client.deposit("1000000"); // 0.01 APT
```

## ⚡ **Why Choose Safe Squad?**

✅ **Security First**: Multi-signature technology ensures fund safety  
✅ **Timely Security**: 2-minute transaction validity prevents attacks  
✅ **User Friendly**: Complex Payments made simple and intuitive  
✅ **Aptos Native**: Built specifically for Aptos ecosystem  
✅ **Modern Design**: Premium UI/UX experience  
✅ **Flexible**: Adaptable to any squad size or use case  
✅ **Transparent**: All activities recorded on blockchain  
✅ **Future Ready**: Scalable architecture for growth  

---

**Safe Squad** - *Where collaboration meets security in the decentralized future* 🚀

---

## Screenshots

<img width="1442" height="672" alt="Screenshot 2025-09-25 at 3 52 22 AM" src="https://github.com/user-attachments/assets/3dde6bd3-47a1-44f1-8405-9ff232feb6c9" />
<img width="1395" height="476" alt="Screenshot 2025-09-25 at 3 52 34 AM" src="https://github.com/user-attachments/assets/39e456b5-f90c-4d47-bc93-148fa386aa54" />
<img width="1394" height="505" alt="Screenshot 2025-09-25 at 3 52 47 AM" src="https://github.com/user-attachments/assets/a6999f85-3f88-4f9a-8d28-3b85a32a8372" />
<img width="1396" height="607" alt="Screenshot 2025-09-25 at 3 53 00 AM" src="https://github.com/user-attachments/assets/d3198193-f252-43e8-bfaf-8a1a00d45d7d" />
<img width="1470" height="831" alt="Screenshot 2025-09-25 at 3 54 43 AM" src="https://github.com/user-attachments/assets/8d153c2b-aac9-40ed-bf9f-d9fd1aee5a25" />





