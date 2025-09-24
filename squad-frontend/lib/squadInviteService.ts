import { client } from '../src/lib/squadClient'
import { Account } from '@aptos-labs/ts-sdk'

export interface SquadInvite {
  id: string
  squadName: string
  creatorWallet: string
  inviteeWallet: string
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED'
  expiresAt: string
  createdAt: string
  updatedAt: string
}

export interface SquadInfo {
  squadName: string
  creatorWallet: string
  memberWallets: string[]
  totalInvites: number
  acceptedInvites: number
  pendingInvites: number
  expiredInvites: number
  isComplete: boolean
  invites: SquadInvite[]
  createdAt: string
  lastActivity: number
}

export class SquadInviteService {
  private baseUrl: string

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl
  }

  // Create an invite
  async createInvite(
    squadName: string,
    creatorWallet: string,
    inviteeWallet: string,
    expiresInDays: number = 7
  ): Promise<{ success: boolean; invite?: SquadInvite; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          squadName,
          creatorWallet,
          inviteeWallet,
          expiresInDays,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, error: data.error }
      }

      return { success: true, invite: data.invite }
    } catch (error) {
      return { success: false, error: 'Network error' }
    }
  }

  // Accept an invite
  async acceptInvite(
    inviteId: string,
    inviteeWallet: string
  ): Promise<{ 
    success: boolean; 
    invite?: SquadInvite; 
    squadStatus?: any; 
    error?: string 
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inviteId,
          inviteeWallet,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, error: data.error }
      }

      return { 
        success: true, 
        invite: data.invite,
        squadStatus: data.squadStatus
      }
    } catch (error) {
      return { success: false, error: 'Network error' }
    }
  }

  // Get squad info for a creator
  async getSquadInfo(creatorWallet: string): Promise<{ 
    success: boolean; 
    squads?: SquadInfo[]; 
    error?: string 
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/squad/${creatorWallet}`)
      const data = await response.json()

      if (!response.ok) {
        return { success: false, error: data.error }
      }

      return { success: true, squads: data.squads }
    } catch (error) {
      return { success: false, error: 'Network error' }
    }
  }

  // Get invites for a wallet address
  async getInvitesForWallet(walletAddress: string): Promise<{ 
    success: boolean; 
    invites?: SquadInvite[]; 
    error?: string 
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/invites/${walletAddress}`)
      const data = await response.json()

      if (!response.ok) {
        return { success: false, error: data.error }
      }

      return { success: true, invites: data.invites }
    } catch (error) {
      return { success: false, error: 'Network error' }
    }
  }

  // Create squad on-chain when all invites are accepted
  async createSquadOnChain(
    account: Account,
    squadName: string,
    memberWallets: string[],
    threshold: number
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      const tx = await client.createSquad(account, {
        members: memberWallets,
        threshold,
      })

      return { success: true, txHash: tx.hash }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  // Complete workflow: create invites and wait for completion
  async createSquadWithInvites(
    account: Account,
    squadName: string,
    inviteeWallets: string[],
    threshold: number,
    expiresInDays: number = 7
  ): Promise<{ 
    success: boolean; 
    invites?: SquadInvite[]; 
    error?: string 
  }> {
    try {
      const creatorWallet = account.accountAddress.toString()
      const invites: SquadInvite[] = []

      // Create invites for all invitees
      for (const inviteeWallet of inviteeWallets) {
        const result = await this.createInvite(
          squadName,
          creatorWallet,
          inviteeWallet,
          expiresInDays
        )

        if (!result.success) {
          return { success: false, error: result.error }
        }

        if (result.invite) {
          invites.push(result.invite)
        }
      }

      return { success: true, invites }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
}

export const squadInviteService = new SquadInviteService()
