"use client";

import { useState, useEffect } from "react";
import { Button, Card, Statistic, Progress, List, Avatar, Badge, Tooltip } from "antd";
import { 
  DashboardOutlined, 
  CheckCircleOutlined, 
  BankOutlined, 
  SettingOutlined, 
  CreditCardOutlined, 
  LineChartOutlined, 
  UserOutlined, 
  QuestionCircleOutlined,
  PlusOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  TeamOutlined,
  ContainerOutlined
} from "@ant-design/icons";
import { client, petraClient } from "../lib/squadClient";
import { Account, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";
import { useAuth } from "../contexts/AuthContext";
import { useRouter } from "next/navigation";
import { squadInviteService, SquadInvite, SquadInfo } from "../../lib/squadInviteService";
// Petra wallet integration
declare global {
  interface Window {
    aptos?: {
      connect: () => Promise<{ address: string; publicKey: string }>;
      disconnect: () => Promise<void>;
      account: () => Promise<{ address: string; publicKey: string }>;
      isConnected: () => Promise<boolean>;
      signAndSubmitTransaction: (transaction: any) => Promise<any>;
      signTransaction: (transaction: any) => Promise<any>;
      submitTransaction: (signedTransaction: any) => Promise<any>;
      // Additional methods that might be available
      signMessage?: (message: any) => Promise<any>;
      network?: () => Promise<string>;
      getNetwork?: () => Promise<string>;
    };
  }
}

export default function Home() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  
  // Petra wallet state
  const [petraAccount, setPetraAccount] = useState<{ address: string; publicKey: string } | null>(null);
  const [petraConnected, setPetraConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('treasury');
  const [squadData, setSquadData] = useState<any>(null);
  const [squadBalance, setSquadBalance] = useState<string>("0");
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  
  // Invite system state
  const [invites, setInvites] = useState<SquadInvite[]>([]);
  const [squadInfo, setSquadInfo] = useState<SquadInfo[]>([]);
  const [inviteeWallet, setInviteeWallet] = useState<string>("");
  const [squadName, setSquadName] = useState<string>("");
  
  // Team formation state
  const [teamSize, setTeamSize] = useState<number>(2);
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [currentMemberIndex, setCurrentMemberIndex] = useState<number>(0);
  const [teamThreshold, setTeamThreshold] = useState<number>(1);
  
  // Single squad management state
  const [userSquad, setUserSquad] = useState<any>(null);
  const [squadProposals, setSquadProposals] = useState<any[]>([]);
  const [personalBalance, setPersonalBalance] = useState<string>("0");
  
  // Transfer proposal state
  const [transferRecipient, setTransferRecipient] = useState<string>("");
  const [transferAmount, setTransferAmount] = useState<string>("0.01");
  
  // Timely transaction state
  const [transactionTimeout, setTransactionTimeout] = useState<NodeJS.Timeout | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  // Helper functions
  const log = (msg: string) => {
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  // Timely transaction helpers
  const startTransactionTimer = () => {
    const timeoutId = setTimeout(() => {
      log("⏰ Transaction timeout: 2 minutes expired");
      setTransactionTimeout(null);
      setTimeRemaining(0);
    }, 120000); // 2 minutes = 120,000ms
    
    setTransactionTimeout(timeoutId);
    setTimeRemaining(120); // 120 seconds
    
    // Update countdown every second
    const countdownInterval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    log("⏰ Transaction timer started: 2 minutes validity window");
  };

  const clearTransactionTimer = () => {
    if (transactionTimeout) {
      clearTimeout(transactionTimeout);
      setTransactionTimeout(null);
      setTimeRemaining(0);
      log("⏰ Transaction timer cleared");
    }
  };

  const formatTimeRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const loadInvites = async () => {
    if (!petraAccount?.address) return;
    try {
      const result = await squadInviteService.getInvitesForWallet(petraAccount.address);
      if (result.success) {
        setInvites(result.invites || []);
      }
    } catch (err) {
      console.error("Error loading invites:", err);
    }
  };

  const loadSquadInfo = async () => {
    if (!petraAccount?.address) return;
    try {
      const result = await squadInviteService.getSquadInfo(petraAccount.address);
      if (result.success) {
        setSquadInfo(result.squads || []);
      }
    } catch (err) {
      console.error("Error loading squad info:", err);
    }
  };

  // Load personal wallet balance
  const loadPersonalBalance = async () => {
    if (!petraAccount?.address) return;
    try {
      const balance = await client.getBalance(petraAccount.address);
      setPersonalBalance(balance);
      log("Personal wallet balance: " + (parseFloat(balance) / 100000000).toFixed(4) + " APT");
    } catch (err) {
      console.error("Error loading personal balance:", err);
    }
  };

  // Single squad management functions
  const loadUserSquad = async () => {
    if (!petraAccount?.address) return;
    try {
      // Check if user is a creator of any squad
      const squadInfoResult = await squadInviteService.getSquadInfo(petraAccount.address);
      let squad = null;
      
      if (squadInfoResult.success && squadInfoResult.squads) {
        // Find completed squad that user created
        const completedSquad = squadInfoResult.squads.find(s => s.isComplete);
        if (completedSquad) {
          try {
            // Check if squad exists on-chain
            const onChainSquad = await client.getSquad(petraAccount.address);
            squad = {
              ...completedSquad,
              isOnChain: !!onChainSquad,
              onChainData: onChainSquad,
              userRole: 'creator',
              squadAddress: petraAccount.address
            };
          } catch (err) {
            squad = {
              ...completedSquad,
              isOnChain: false,
              userRole: 'creator',
              squadAddress: petraAccount.address
            };
          }
        }
      }

      // If user is not a creator, check if they're a member
      if (!squad) {
        const invitesResult = await squadInviteService.getInvitesForWallet(petraAccount.address);
        if (invitesResult.success && invitesResult.invites) {
          const acceptedInvite = invitesResult.invites.find(invite => invite.status === 'ACCEPTED');
          if (acceptedInvite) {
            try {
              // Check if the squad they joined is on-chain
              const onChainSquad = await client.getSquad(acceptedInvite.creatorWallet);
              if (onChainSquad) {
                squad = {
                  squadName: acceptedInvite.squadName,
                  creatorWallet: acceptedInvite.creatorWallet,
                  memberWallets: onChainSquad.members,
                  threshold: onChainSquad.threshold,
                  isOnChain: true,
                  onChainData: onChainSquad,
                  userRole: 'member',
                  squadAddress: acceptedInvite.creatorWallet
                };
              }
            } catch (err) {
              // Squad not on-chain yet
            }
          }
        }
      }

      setUserSquad(squad);
      
      // Load proposals if squad is on-chain
      if (squad?.isOnChain) {
        await loadSquadProposals(squad);
      }
      
    } catch (err) {
      console.error("Error loading user squad:", err);
    }
  };

  const loadSquadProposals = async (squad: any) => {
    if (!squad?.isOnChain || !petraAccount?.address) return;
    
    try {
      // TODO: Implement getProposals method in SquadFundsClient
      // For now, use empty array
      setSquadProposals([]);
    } catch (err) {
      console.error("Error loading squad proposals:", err);
      setSquadProposals([]);
    }
  };

  // Team formation helper functions
  const initializeTeamFormation = () => {
    if (!petraAccount?.address) {
      log("Please connect your wallet first");
      return;
    }
    
    // Initialize team with creator as first member
    const newMembers = new Array(teamSize).fill("");
    newMembers[0] = petraAccount.address; // Creator is always first member
    
    setTeamMembers(newMembers);
    setCurrentMemberIndex(1); // Start from second member (index 1)
    setTeamThreshold(Math.ceil(teamSize / 2)); // Default threshold is majority
    
    log(`Team initialized! You are Member 1. Adding ${teamSize - 1} more members...`);
  };

  const addTeamMember = (walletAddress: string) => {
    const newMembers = [...teamMembers];
    newMembers[currentMemberIndex] = walletAddress;
    setTeamMembers(newMembers);
    
    if (currentMemberIndex < teamSize - 1) {
      setCurrentMemberIndex(currentMemberIndex + 1);
    }
  };

  const sendTeamInvites = async () => {
    if (!petraAccount?.address || !squadName) {
      return log("Please provide squad name and connect wallet");
    }

    // Filter out empty members and exclude the creator (first member)
    const validMembers = teamMembers
      .slice(1) // Skip the creator (first member)
      .filter(member => member.trim().length > 0);
    
    if (validMembers.length === 0) {
      return log("Please add at least one team member to invite");
    }

    setLoading(true);
    try {
      // Send invites to all team members except the creator
      for (const memberWallet of validMembers) {
        const result = await squadInviteService.createInvite(
          squadName,
          petraAccount.address,
          memberWallet,
          7 // expires in 7 days
        );

        if (result.success) {
          log(`Invite sent to ${memberWallet.slice(0, 8)}...`);
        } else {
          log(`Failed to send invite to ${memberWallet.slice(0, 8)}...: ${result.error}`);
        }
      }

      log(`Team invites sent! Waiting for ${validMembers.length} members to accept.`);
      
      // Refresh squad info
      await loadSquadInfo();
      
      // Reset form
      setTeamMembers([]);
      setCurrentMemberIndex(0);
      setSquadName("");
      
    } catch (err: any) {
      log("Error sending team invites: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const createTeamOnChain = async () => {
    if (!petraAccount?.address) return log("No account connected");
    
    // Get accepted members from squad info
    const squad = squadInfo.find(s => s.isComplete);
    if (!squad) {
      return log("No complete squad found. Wait for all members to accept invites.");
    }

    setLoading(true);
    try {
      // Use Petra wallet client for create squad
      const response = await petraClient.createSquad(squad.memberWallets, teamThreshold);
      
      log(`🎉 Team created on-chain! Transaction: ${response.hash}`);
      log(`Team: ${squad.memberWallets.length} members, threshold: ${teamThreshold}`);
      
      // Refresh user squad data
      setTimeout(async () => {
        try {
          await loadUserSquad();
          log("Squad data refreshed");
        } catch (err) {
          log("Error refreshing squad data");
        }
      }, 2000);
      
    } catch (err: any) {
      log("Error creating team on-chain: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  // Check Petra wallet connection on mount
  useEffect(() => {
    const checkPetraConnection = async () => {
      if (typeof window !== 'undefined' && window.aptos) {
        try {
          const isConnected = await window.aptos.isConnected();
          if (isConnected) {
            const account = await window.aptos.account();
            setPetraAccount(account);
            setPetraConnected(true);
          }
        } catch (error) {
          console.log('Petra wallet not available');
        }
      }
    };
    
    checkPetraConnection();
  }, []);

  // Load invites and squad when wallet connects
  useEffect(() => {
    if (petraAccount?.address) {
      loadInvites();
      loadSquadInfo();
      loadUserSquad();
      loadPersonalBalance(); // Load personal wallet balance
    }
  }, [petraAccount?.address]);

  // Load squad data when wallet connects
  useEffect(() => {
    const loadSquadData = async () => {
      if (petraAccount?.address) {
        try {
          const squad = await client.getSquad(petraAccount.address);
          if (squad) {
            setSquadData(squad);
            log("Squad found with " + squad.members.length + " members");
            
            // Use squad's treasury balance, not personal wallet balance
            setSquadBalance(squad.balance);
            log("Squad treasury balance: " + (parseFloat(squad.balance) / 100000000).toFixed(4) + " APT");
          } else {
            log("No squad found for this account");
            setSquadBalance("0");
          }
        } catch (err) {
          log("No squad found for this account");
          setSquadBalance("0");
        }
      }
    };

    loadSquadData();
  }, [petraAccount?.address]);

  // Cleanup transaction timer on unmount
  useEffect(() => {
    return () => {
      clearTransactionTimer();
    };
  }, []);

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#111827', 
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2>Loading...</h2>
          <p>Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  // Petra wallet connection handlers
  const handleConnectWallet = async () => {
    setLoading(true);
    try {
      if (typeof window !== 'undefined' && window.aptos) {
        const account = await window.aptos.connect();
        setPetraAccount(account);
        setPetraConnected(true);
        log("Connected to Petra wallet: " + account.address);
      } else {
        log("Petra wallet not installed. Please install Petra wallet extension.");
      }
    } catch (err: any) {
      log("Error connecting wallet: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectWallet = async () => {
    try {
      if (typeof window !== 'undefined' && window.aptos) {
        await window.aptos.disconnect();
        setPetraAccount(null);
        setPetraConnected(false);
        setSquadData(null);
        setSquadBalance("0");
        log("Disconnected wallet");
      }
    } catch (err: any) {
      log("Error disconnecting wallet: " + err.message);
    }
  };

  // Test Petra wallet function
  const testPetraWallet = async () => {
    if (!petraAccount?.address) return log("No account connected");
    setLoading(true);
    try {
      const response = await petraClient.testPetraWallet();
      log(`✅ Petra wallet test successful! Transaction: ${response.hash}`);
      log(`🔗 View on explorer: https://explorer.aptoslabs.com/txn/${response.hash}?network=testnet`);
    } catch (err: any) {
      log("❌ Petra wallet test failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Squad management functions
  const handleDeposit = async () => {
    if (!petraAccount?.address || !userSquad?.isOnChain) return log("No squad selected or squad not on-chain");
    setLoading(true);
    
    // Start transaction timer
    startTransactionTimer();
    
    try {
      // Use Petra wallet client for deposit
      const response = await petraClient.deposit("1000000"); // 0.01 APT in micro APT
      
      log(`✅ Deposit successful! Transaction: ${response.hash}`);
      log(`⏰ Transaction valid for 2 minutes`);
      
      // Clear timer on success
      clearTransactionTimer();
      
      // Refresh squad data
      setTimeout(async () => {
        try {
          const updatedSquad = await client.getSquad(userSquad.squadAddress);
          if (updatedSquad) {
            setUserSquad({ ...userSquad, onChainData: updatedSquad });
            setSquadBalance(updatedSquad.balance); // Update treasury balance
            log("Squad data refreshed - Treasury balance: " + (parseFloat(updatedSquad.balance) / 100000000).toFixed(4) + " APT");
          }
        } catch (err) {
          log("Error refreshing squad data");
        }
      }, 2000);
    } catch (err: any) {
      log("❌ Error depositing: " + err.message);
      clearTransactionTimer();
    } finally {
      setLoading(false);
    }
  };

  const handleProposeTransfer = async () => {
    if (!petraAccount?.address || !userSquad?.isOnChain) return log("No squad selected or squad not on-chain");
    
    // Validate inputs
    if (!transferRecipient.trim()) {
      return log("Please enter recipient address");
    }
    
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      return log("Please enter a valid amount");
    }
    
    // Convert APT to micro APT
    const amountInMicroAPT = Math.floor(amount * 100000000).toString();
    
    setLoading(true);
    
    // Start transaction timer
    startTransactionTimer();
    
    try {
      // Use Petra wallet client for propose transfer
      const response = await petraClient.proposeTransfer(
        transferRecipient.trim(), // recipient from user input
        amountInMicroAPT // amount from user input
      );
      
      log(`✅ Transfer proposed! Transaction: ${response.hash}`);
      log(`⏰ Transaction valid for 2 minutes`);
      log(`Proposing to send ${transferAmount} APT to ${transferRecipient.slice(0, 8)}...${transferRecipient.slice(-8)}`);
      
      // Clear timer on success
      clearTransactionTimer();
      
      // Refresh proposals
      await loadSquadProposals(userSquad);
      
      // Clear form
      setTransferRecipient("");
      setTransferAmount("0.01");
    } catch (err: any) {
      log("❌ Error proposing transfer: " + err.message);
      clearTransactionTimer();
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!petraAccount?.address || !userSquad?.isOnChain) return log("No squad selected or squad not on-chain");
    setLoading(true);
    
    // Start transaction timer
    startTransactionTimer();
    
    try {
      const squad = await client.getSquad(userSquad.squadAddress);
      if (!squad) return log("No squad found for this account");

      const lastProposalId = squad.nextProposalId - 1;
      if (lastProposalId < 0) return log("No proposals to approve");

      // Use Petra wallet client for approve
      const response = await petraClient.approve(lastProposalId);
      
      log(`✅ Proposal approved! Transaction: ${response.hash}`);
      log(`⏰ Transaction valid for 2 minutes`);
      
      // Clear timer on success
      clearTransactionTimer();
      
      // Refresh proposals
      await loadSquadProposals(userSquad);
    } catch (err: any) {
      log("❌ Error approving: " + err.message);
      clearTransactionTimer();
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!petraAccount?.address || !userSquad?.isOnChain) return log("No squad selected or squad not on-chain");
    setLoading(true);
    
    // Start transaction timer
    startTransactionTimer();
    
    try {
      const squad = await client.getSquad(userSquad.squadAddress);
      if (!squad) return log("No squad found for this account");

      const lastProposalId = squad.nextProposalId - 1;
      if (lastProposalId < 0) return log("No proposals to execute");

      // Use Petra wallet client for execute
      const response = await petraClient.execute(lastProposalId);
      
      log(`✅ Proposal executed! Transaction: ${response.hash}`);
      log(`⏰ Transaction valid for 2 minutes`);
      
      // Clear timer on success
      clearTransactionTimer();
      
      // Refresh proposals and squad data
      await loadSquadProposals(userSquad);
      setTimeout(async () => {
        try {
          const updatedSquad = await client.getSquad(userSquad.squadAddress);
          if (updatedSquad) {
            setUserSquad({ ...userSquad, onChainData: updatedSquad });
            setSquadBalance(updatedSquad.balance); // Update treasury balance
            log("Squad data refreshed - Treasury balance: " + (parseFloat(updatedSquad.balance) / 100000000).toFixed(4) + " APT");
          }
        } catch (err) {
          log("Error refreshing squad data");
        }
      }, 2000);
    } catch (err: any) {
      log("❌ Error executing: " + err.message);
      clearTransactionTimer();
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async (inviteId: string) => {
    if (!petraAccount?.address) return log("No account connected");
    setLoading(true);
    try {
      const result = await squadInviteService.acceptInvite(
        inviteId,
        petraAccount.address
      );

      if (result.success) {
        log(`Invite accepted successfully!`);
        
        // Check if squad is complete
        if (result.squadStatus?.isComplete) {
          log("🎉 Squad is complete! All invites accepted. You can now create the squad on-chain.");
          
          // Auto-create squad on-chain if complete
          const squadInfo = await squadInviteService.getSquadInfo(petraAccount.address);
          if (squadInfo.success && squadInfo.squads) {
            const completeSquad = squadInfo.squads.find(s => s.isComplete);
            if (completeSquad) {
              // For now, we'll skip auto-creating the squad on-chain since we need Petra wallet integration
              // In a real implementation, you'd use Petra wallet to sign the transaction
              log("Squad is complete! You can now create the squad on-chain manually.");
            }
          }
        }
        
        // Refresh data
        await loadInvites();
        await loadSquadInfo();
      } else {
        log(`Error accepting invite: ${result.error}`);
      }
    } catch (err: any) {
      log("Error accepting invite: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const sidebarItems = [
    { key: 'dashboard', label: 'Dashboard', icon: <DashboardOutlined /> },
    { key: 'approvals', label: 'Approvals', icon: <CheckCircleOutlined /> },
    { key: 'treasury', label: 'Treasury', icon: <BankOutlined /> },
    { key: 'operations', label: 'Operations', icon: <SettingOutlined /> },
    { key: 'payments', label: 'Payments', icon: <CreditCardOutlined /> },
    { key: 'trade', label: 'Trade', icon: <LineChartOutlined /> },
    { key: 'settings', label: 'Settings', icon: <SettingOutlined /> },
    { key: 'members', label: 'Members', icon: <UserOutlined /> },
    { key: 'help', label: 'Help & Support', icon: <QuestionCircleOutlined /> },
  ];

  const renderTreasuryContent = () => (
    <div>
      {/* Team Formation Steps */}
      <div style={{ display: 'grid', gap: '2rem' }}>
        {/* Step 1: Choose Team Size */}
        <div>
          <h3 style={{ color: '#ffffff', marginBottom: '1rem', fontSize: '1.1rem', fontWeight: '600' }}>Step 1: Choose Team Size</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                Team Size
              </label>
              <input
                type="number"
                min="2"
                max="10"
                value={teamSize}
                onChange={(e) => setTeamSize(parseInt(e.target.value) || 2)}
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255, 255, 255, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                Squad Name
              </label>
              <input
                type="text"
                placeholder="Hackathon Team"
                value={squadName}
                onChange={(e) => setSquadName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255, 255, 255, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
            <div>
              <button 
                onClick={initializeTeamFormation}
                style={{ 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '1rem 2rem',
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(102, 126, 234, 0.4)',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(102, 126, 234, 0.6)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(102, 126, 234, 0.4)';
                }}
              >
                Initialize Team
              </button>
            </div>
          </div>
        </div>

        {/* Step 2: Add Team Members */}
        {teamMembers.length > 0 && (
          <div>
            <h3 style={{ color: '#ffffff', marginBottom: '1rem', fontSize: '1.1rem', fontWeight: '600' }}>
              Step 2: Add Team Members ({currentMemberIndex}/{teamSize - 1} remaining)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  Member {currentMemberIndex + 1} Wallet Address
                </label>
                <input
                  type="text"
                  placeholder="0x123..."
                  value={teamMembers[currentMemberIndex] || ''}
                  onChange={(e) => {
                    const newMembers = [...teamMembers];
                    newMembers[currentMemberIndex] = e.target.value;
                    setTeamMembers(newMembers);
                  }}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '0.9rem',
                    outline: 'none',
                    transition: 'all 0.3s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.5)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={() => {
                    if (currentMemberIndex < teamSize - 1) {
                      setCurrentMemberIndex(currentMemberIndex + 1);
                    }
                  }}
                  disabled={currentMemberIndex >= teamSize - 1}
                  style={{ 
                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    border: 'none',
                    borderRadius: '16px',
                    padding: '1rem 1.5rem',
                    color: 'white',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(5, 150, 105, 0.4)',
                    transition: 'all 0.3s ease',
                    opacity: currentMemberIndex >= teamSize - 1 ? 0.5 : 1
                  }}
                >
                  Next Member
                </button>
                <button 
                  onClick={sendTeamInvites}
                  disabled={loading}
                  style={{ 
                    background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                    border: 'none',
                    borderRadius: '16px',
                    padding: '1rem 1.5rem',
                    color: 'white',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(217, 119, 6, 0.4)',
                    transition: 'all 0.3s ease',
                    opacity: loading ? 0.7 : 1
                  }}
                >
                  {loading ? 'Sending...' : 'Send Invites'}
                </button>
              </div>
            </div>

            {/* Show all team members */}
            <div style={{ marginTop: '1.5rem' }}>
              <h4 style={{ color: '#ffffff', fontSize: '1rem', marginBottom: '0.75rem' }}>Team Members:</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {teamMembers.map((member, index) => (
                  <div 
                    key={index}
                    style={{ 
                      padding: '0.75rem',
                      background: member ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)',
                      borderRadius: '12px',
                      border: member ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(255, 255, 255, 0.05)',
                      color: member ? 'white' : 'rgba(255, 255, 255, 0.5)',
                      fontSize: '0.9rem'
                    }}
                  >
                    Member {index + 1}: {index === 0 ? 'You (Creator)' : member || 'Not added yet'}
                    {index === 0 && member && (
                      <span style={{ color: '#10b981', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                        ✓ Ready
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Set Threshold and Create Team */}
        {squadInfo.some(squad => squad.isComplete) && (
          <div>
            <h3 style={{ color: '#ffffff', marginBottom: '1rem', fontSize: '1.1rem', fontWeight: '600' }}>Step 3: Create Team On-Chain</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  Threshold
                </label>
                <input
                  type="number"
                  min="1"
                  max={teamSize}
                  value={teamThreshold}
                  onChange={(e) => setTeamThreshold(parseInt(e.target.value) || 1)}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '0.9rem',
                    outline: 'none',
                    transition: 'all 0.3s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.5)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
              <div>
                <button 
                  onClick={createTeamOnChain}
                  disabled={loading}
                  style={{ 
                    background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                    border: 'none',
                    borderRadius: '16px',
                    padding: '1rem 2rem',
                    color: 'white',
                    fontWeight: '600',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(124, 58, 237, 0.4)',
                    transition: 'all 0.3s ease',
                    opacity: loading ? 0.7 : 1
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(124, 58, 237, 0.6)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(124, 58, 237, 0.4)';
                  }}
                >
                  {loading ? 'Creating...' : '🚀 Create Team On-Chain'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pending Invites */}
        {invites.length > 0 && (
          <div>
            <h3 style={{ color: '#ffffff', marginBottom: '1rem', fontSize: '1.1rem', fontWeight: '600' }}>Your Invites</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {invites.map((invite) => (
                <div 
                  key={invite.id}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '1rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <div>
                    <div style={{ color: 'white', fontWeight: '600', fontSize: '1rem' }}>
                      {invite.squadName}
                    </div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>
                      From: {invite.creatorWallet.slice(0, 8)}...{invite.creatorWallet.slice(-8)}
                    </div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.8rem' }}>
                      Status: {invite.status} | Expires: {new Date(invite.expiresAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    {invite.status === 'PENDING' && (
                      <button 
                        onClick={() => handleAcceptInvite(invite.id)}
                        disabled={loading}
                        style={{ 
                          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                          border: 'none',
                          borderRadius: '12px',
                          padding: '0.75rem 1.5rem',
                          color: 'white',
                          fontWeight: '600',
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                          boxShadow: '0 4px 16px rgba(37, 99, 235, 0.4)',
                          transition: 'all 0.3s ease',
                          opacity: loading ? 0.7 : 1
                        }}
                      >
                        {loading ? 'Processing...' : 'Accept'}
                      </button>
                    )}
                    {invite.status === 'ACCEPTED' && (
                      <span style={{ color: '#10b981', fontSize: '0.9rem', fontWeight: '600' }}>
                        ✓ Accepted
                      </span>
                    )}
                    {invite.status === 'EXPIRED' && (
                      <span style={{ color: '#ef4444', fontSize: '0.9rem', fontWeight: '600' }}>
                        ✗ Expired
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Squad Status */}
        {squadInfo.length > 0 && (
          <div>
            <h3 style={{ color: '#ffffff', marginBottom: '1rem', fontSize: '1.1rem', fontWeight: '600' }}>Squad Status</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {squadInfo.map((squad) => (
                <div 
                  key={squad.squadName}
                  style={{ 
                    padding: '1rem',
                    background: squad.isComplete ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                    borderRadius: '12px',
                    border: `1px solid ${squad.isComplete ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ color: 'white', fontWeight: '600', fontSize: '1rem' }}>
                        {squad.squadName}
                      </div>
                      <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>
                        {squad.acceptedInvites}/{squad.totalInvites} members accepted
                      </div>
                    </div>
                    <div>
                      {squad.isComplete ? (
                        <span style={{ color: '#10b981', fontSize: '0.9rem', fontWeight: '600' }}>
                          🎉 Complete!
                        </span>
                      ) : (
                        <span style={{ color: '#3b82f6', fontSize: '0.9rem', fontWeight: '600' }}>
                          {squad.pendingInvites} pending
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #000000 0%, #111111 50%, #1a1a1a 100%)',
      color: 'white',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated Background Elements */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        left: '-50%',
        width: '200%',
        height: '200%',
        background: 'radial-gradient(circle at 20% 80%, rgba(255, 255, 255, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.03) 0%, transparent 50%), radial-gradient(circle at 40% 40%, rgba(255, 255, 255, 0.02) 0%, transparent 50%)',
        animation: 'float 20s ease-in-out infinite',
        zIndex: 0
      }} />
      
      {/* Main Container */}
      <div style={{ 
        position: 'relative',
        zIndex: 1,
        padding: '2rem',
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '3rem',
          padding: '2rem',
          background: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
        }}>
          {/* Logo and Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            
        <div>
              <h1 style={{ 
                fontSize: '2.5rem', 
                fontWeight: '800', 
                color: '#ffffff',
                margin: 0,
                letterSpacing: '-0.02em'
              }}>
                Safe Squad
              </h1>
              <p style={{ 
                color: 'rgba(255, 255, 255, 0.7)', 
                fontSize: '1rem', 
                margin: 0,
                fontWeight: '500'
              }}>
                Decentralized Treasury Management
              </p>
            </div>
          </div>
          
          {/* Wallet Connection */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            {!petraConnected ? (
              <button 
                onClick={handleConnectWallet} 
                disabled={loading}
                style={{ 
                  background: 'linear-gradient(135deg, #ffffff 0%, #cccccc 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  color: '#000000',
                  fontWeight: '600',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(255, 255, 255, 0.2)',
                  transition: 'all 0.3s ease',
                  opacity: loading ? 0.7 : 1
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 255, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(255, 255, 255, 0.2)';
                }}
              >
                {loading ? 'Connecting...' : 'Connect Petra Wallet'}
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ 
                  padding: '8px 16px',
                  background: 'rgba(34, 197, 94, 0.1)',
                  borderRadius: '12px',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  color: '#22c55e',
                  fontSize: '0.9rem',
                  fontWeight: '600'
                }}>
                  ✓ Connected: {petraAccount?.address?.slice(0, 8)}...
                </div>
                <button 
                  onClick={handleDisconnectWallet}
                  style={{ 
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '12px',
                    padding: '8px 16px',
                    color: '#ef4444',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
            Disconnect
                </button>
        </div>
      )}

            {/* User Info */}
            {user && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {user.image && (
                  <img 
                    src={user.image} 
                    alt="Profile" 
                    style={{ 
                      width: '48px', 
                      height: '48px', 
                      borderRadius: '12px',
                      border: '2px solid rgba(255, 255, 255, 0.1)'
                    }} 
                  />
                )}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1rem', fontWeight: '600', color: 'white' }}>
                    {user.name || user.email}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                    {user.email}
                  </div>
                </div>
                <button 
                  onClick={() => signOut()}
                  style={{ 
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '12px',
                    padding: '8px 16px',
                    color: '#ef4444',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
          {/* Treasury Overview */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '2rem',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
          }}>
            <h2 style={{ 
              fontSize: '1.5rem', 
              fontWeight: '700', 
              marginBottom: '1.5rem',
              color: '#ffffff'
            }}>
              Treasury Overview
            </h2>
            
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ 
                fontSize: '3rem', 
                fontWeight: '800', 
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '0.5rem'
              }}>
                {squadBalance ? `${(parseFloat(squadBalance) / 100000000).toFixed(4)} APT` : '0.0000 APT'}
              </div>
              <div style={{ 
                color: 'rgba(255, 255, 255, 0.7)', 
                fontSize: '1.1rem',
                marginBottom: '0.5rem'
              }}>
                {squadData ? `Squad: ${squadData.members.length} members, threshold: ${squadData.threshold}` : 'Connect wallet to view squad info'}
              </div>
              <div style={{ 
                color: 'rgba(255, 255, 255, 0.5)', 
                fontSize: '0.9rem'
              }}>
                Personal Wallet: {personalBalance ? `${(parseFloat(personalBalance) / 100000000).toFixed(4)} APT` : '0.0000 APT'}
              </div>
            </div>
          </div>

          {/* Squad Info */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '2rem',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
          }}>
            <h2 style={{ 
              fontSize: '1.5rem', 
              fontWeight: '700', 
              marginBottom: '1.5rem',
              color: '#ffffff'
            }}>
              Squad Information
            </h2>
            
            {userSquad ? (
              <div>
                <div style={{ 
                  padding: '1.5rem', 
                  background: 'rgba(0, 0, 0, 0.3)', 
                  borderRadius: '16px',
                  marginBottom: '1.5rem',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                    <div>
                      <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Your Role</div>
                      <div style={{ color: 'white', fontWeight: '600', fontSize: '1.1rem' }}>
                        {userSquad.userRole === 'creator' ? '👑 Creator' : '👤 Member'}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Squad Size</div>
                      <div style={{ color: 'white', fontWeight: '600', fontSize: '1.1rem' }}>
                        {userSquad.memberWallets?.length || userSquad.totalInvites || 0} members
                      </div>
                    </div>
                    {userSquad.isOnChain && (
                      <>
                        <div>
                          <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Threshold</div>
                          <div style={{ color: 'white', fontWeight: '600', fontSize: '1.1rem' }}>
                            {userSquad.threshold || userSquad.onChainData?.threshold}
                          </div>
                        </div>
                        <div>
                          <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Balance</div>
                          <div style={{ color: 'white', fontWeight: '600', fontSize: '1.1rem' }}>
                            {userSquad.onChainData?.balance ? `${(parseFloat(userSquad.onChainData.balance) / 100000000).toFixed(4)} APT` : '0.0000 APT'}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Squad Members */}
                <div>
                  <h3 style={{ color: '#ffffff', fontSize: '1rem', marginBottom: '0.75rem' }}>Squad Members:</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {(userSquad.memberWallets || []).map((member: string, index: number) => (
                      <div 
                        key={index}
                        style={{ 
                          padding: '0.75rem',
                          background: member === petraAccount?.address ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.3)',
                          borderRadius: '12px',
                          border: member === petraAccount?.address ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                          color: 'white',
                          fontSize: '0.9rem'
                        }}
                      >
                        Member {index + 1}: {member === petraAccount?.address ? 'You' : member.slice(0, 8) + '...' + member.slice(-8)}
                        {member === petraAccount?.address && <span style={{ color: '#3b82f6', fontSize: '0.8rem', marginLeft: '0.5rem' }}>👤</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '2rem',
                color: 'rgba(255, 255, 255, 0.6)'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏛️</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>No Squad Found</div>
                <div style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Create or join a squad to get started</div>
              </div>
            )}
          </div>
        </div>

        {/* Transaction Timer */}
        {timeRemaining > 0 && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            padding: '1.5rem',
            marginBottom: '2rem',
            boxShadow: '0 8px 32px rgba(239, 68, 68, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
              <div style={{ fontSize: '2rem' }}>⏰</div>
              <div>
                <div style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: '700', 
                  color: '#ef4444',
                  textAlign: 'center'
                }}>
                  Transaction Timer: {formatTimeRemaining(timeRemaining)}
                </div>
                <div style={{ 
                  color: 'rgba(255, 255, 255, 0.7)', 
                  fontSize: '0.9rem',
                  textAlign: 'center'
                }}>
                  Transaction expires in {formatTimeRemaining(timeRemaining)} - Aptos Timely Transaction Security
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transaction Logs */}
        {logs.length > 0 && (
          <div style={{
            background: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '2rem',
            marginBottom: '2rem',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
          }}>
            <h2 style={{ 
              fontSize: '1.5rem', 
              fontWeight: '700', 
              marginBottom: '1.5rem',
              color: '#ffffff'
            }}>
              Transaction Logs
            </h2>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {logs.slice(-10).reverse().map((log, index) => (
                  <div 
                    key={index} 
                    style={{ 
                      fontSize: '0.9rem', 
                      color: 'rgba(255, 255, 255, 0.8)', 
                      fontFamily: 'Monaco, Consolas, monospace', 
                      background: 'rgba(0, 0, 0, 0.3)', 
                      padding: '1rem', 
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Squad Actions */}
        {petraConnected && userSquad && (
          <div style={{
            background: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '2rem',
            marginBottom: '2rem',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
          }}>
            <h2 style={{ 
              fontSize: '1.5rem', 
              fontWeight: '700', 
              marginBottom: '2rem',
              color: '#ffffff'
            }}>
              Squad Actions
            </h2>
            
            {userSquad.isOnChain ? (
              <div style={{ display: 'grid', gap: '2rem' }}>
                {/* Deposit */}
                <div>
                  <h3 style={{ color: '#ffffff', marginBottom: '1rem', fontSize: '1.1rem', fontWeight: '600' }}>Deposit Funds</h3>
                  <button 
                    onClick={handleDeposit}
                    disabled={loading}
                    style={{ 
                      background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                      border: 'none',
                      borderRadius: '16px',
                      padding: '1rem 2rem',
                      color: 'white',
                      fontWeight: '600',
                      fontSize: '1rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 16px rgba(5, 150, 105, 0.4)',
                      transition: 'all 0.3s ease',
                      opacity: loading ? 0.7 : 1
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(5, 150, 105, 0.6)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(5, 150, 105, 0.4)';
                    }}
                  >
                    {loading ? 'Processing...' : 'Deposit 0.01 APT'}
                  </button>
                </div>

                {/* Transfer Proposal */}
                <div>
                  <h3 style={{ color: '#ffffff', marginBottom: '1rem', fontSize: '1.1rem', fontWeight: '600' }}>Propose Transfer</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
                    <div>
                      <label style={{ display: 'block', color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                        Recipient Address
                      </label>
                      <input
                        type="text"
                        placeholder="0x123..."
                        value={transferRecipient}
                        onChange={(e) => setTransferRecipient(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '1rem',
                          background: 'rgba(0, 0, 0, 0.3)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '12px',
                          color: 'white',
                          fontSize: '0.9rem',
                          outline: 'none',
                          transition: 'all 0.3s ease'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255, 255, 255, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                        Amount (APT)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.01"
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '1rem',
                          background: 'rgba(0, 0, 0, 0.3)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '12px',
                          color: 'white',
                          fontSize: '0.9rem',
                          outline: 'none',
                          transition: 'all 0.3s ease'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255, 255, 255, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                    <div>
                      <button 
                        onClick={handleProposeTransfer}
                        disabled={loading}
                        style={{ 
                          background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                          border: 'none',
                          borderRadius: '16px',
                          padding: '1rem 2rem',
                          color: 'white',
                          fontWeight: '600',
                          fontSize: '1rem',
                          cursor: 'pointer',
                          boxShadow: '0 4px 16px rgba(217, 119, 6, 0.4)',
                          transition: 'all 0.3s ease',
                          opacity: loading ? 0.7 : 1
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 8px 24px rgba(217, 119, 6, 0.6)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 4px 16px rgba(217, 119, 6, 0.4)';
                        }}
                      >
                        {loading ? 'Processing...' : 'Propose Transfer'}
                      </button>
                    </div>
                  </div>
      </div>

                {/* Approve and Execute */}
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button 
                    onClick={handleApprove}
                    disabled={loading}
                    style={{ 
                      background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                      border: 'none',
                      borderRadius: '16px',
                      padding: '1rem 2rem',
                      color: 'white',
                      fontWeight: '600',
                      fontSize: '1rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 16px rgba(37, 99, 235, 0.4)',
                      transition: 'all 0.3s ease',
                      opacity: loading ? 0.7 : 1,
                      flex: 1
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(37, 99, 235, 0.6)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(37, 99, 235, 0.4)';
                    }}
                  >
                    {loading ? 'Processing...' : 'Approve Proposal'}
                  </button>
                  <button 
                    onClick={handleExecute}
                    disabled={loading}
                    style={{ 
                      background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                      border: 'none',
                      borderRadius: '16px',
                      padding: '1rem 2rem',
                      color: 'white',
                      fontWeight: '600',
                      fontSize: '1rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 16px rgba(124, 58, 237, 0.4)',
                      transition: 'all 0.3s ease',
                      opacity: loading ? 0.7 : 1,
                      flex: 1
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(124, 58, 237, 0.6)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(124, 58, 237, 0.4)';
                    }}
                  >
                    {loading ? 'Processing...' : 'Execute Proposal'}
                  </button>
      </div>
              </div>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '2rem',
                color: 'rgba(255, 255, 255, 0.6)'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>Squad Not On-Chain Yet</div>
                <div style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Complete the team formation process to enable squad actions</div>
              </div>
            )}
          </div>
        )}

        {/* Team Formation */}
        {petraConnected && (
          <div style={{
            background: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '2rem',
            marginBottom: '2rem',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
          }}>
            <h2 style={{ 
              fontSize: '1.5rem', 
              fontWeight: '700', 
              marginBottom: '2rem',
              background: 'linear-gradient(135deg, #ffffff 0%, #cccccc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Team Formation
            </h2>
            
            {renderTreasuryContent()}
          </div>
        )}

        {/* Petra Wallet Test */}
        {/* {petraConnected && (
          <div style={{
            background: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '2rem',
            marginBottom: '2rem',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
          }}>
            <h2 style={{ 
              fontSize: '1.5rem', 
              fontWeight: '700', 
              marginBottom: '1.5rem',
              color: '#ffffff'
            }}>
              Petra Wallet Test
            </h2>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button 
                onClick={testPetraWallet}
                disabled={loading}
                style={{ 
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '1rem 2rem',
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)',
                  transition: 'all 0.3s ease',
                  opacity: loading ? 0.7 : 1
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(16, 185, 129, 0.6)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(16, 185, 129, 0.4)';
                }}
              >
                {loading ? 'Testing...' : '🧪 Test Petra Wallet'}
              </button>
              <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>
                This will send a test transaction to verify Petra wallet is working correctly.
              </div>
            </div>
          </div>
        )} */}

      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translate(0px, 0px) rotate(0deg); }
          33% { transform: translate(30px, -30px) rotate(120deg); }
          66% { transform: translate(-20px, 20px) rotate(240deg); }
        }
      `}</style>
    </div>
  );
}
