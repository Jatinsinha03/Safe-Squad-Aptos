import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ creatorWallet: string }> }
) {
  try {
    const { creatorWallet } = await params

    // Validate wallet address format
    const walletRegex = /^0x[a-fA-F0-9]{64}$/
    if (!walletRegex.test(creatorWallet)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      )
    }

    // Get all invites for this creator
    const invites = await prisma.squadInvite.findMany({
      where: { creatorWallet },
      include: {
        creator: true,
        invitee: true
      },
      orderBy: [
        { squadName: 'asc' },
        { createdAt: 'asc' }
      ]
    })

    if (invites.length === 0) {
      return NextResponse.json({
        success: true,
        creatorWallet,
        squads: []
      })
    }

    // Group invites by squad name
    const squadGroups = invites.reduce((acc, invite) => {
      if (!acc[invite.squadName]) {
        acc[invite.squadName] = []
      }
      acc[invite.squadName].push(invite)
      return acc
    }, {} as Record<string, typeof invites>)

    // Process each squad
    const squads = Object.entries(squadGroups).map(([squadName, squadInvites]) => {
      const totalInvites = squadInvites.length
      const acceptedInvites = squadInvites.filter(inv => inv.status === 'ACCEPTED').length
      const pendingInvites = squadInvites.filter(inv => inv.status === 'PENDING').length
      const expiredInvites = squadInvites.filter(inv => inv.status === 'EXPIRED').length
      const isComplete = acceptedInvites === totalInvites && totalInvites > 0

      // Get all member wallets (creator + accepted invitees)
      const memberWallets = [
        creatorWallet,
        ...squadInvites
          .filter(inv => inv.status === 'ACCEPTED')
          .map(inv => inv.inviteeWallet)
      ]

      return {
        squadName,
        creatorWallet,
        memberWallets,
        totalInvites,
        acceptedInvites,
        pendingInvites,
        expiredInvites,
        isComplete,
        invites: squadInvites.map(invite => ({
          id: invite.id,
          inviteeWallet: invite.inviteeWallet,
          status: invite.status,
          expiresAt: invite.expiresAt,
          createdAt: invite.createdAt,
          updatedAt: invite.updatedAt
        })),
        createdAt: squadInvites[0].createdAt,
        lastActivity: Math.max(...squadInvites.map(inv => inv.updatedAt.getTime()))
      }
    })

    return NextResponse.json({
      success: true,
      creatorWallet,
      squads
    })

  } catch (error) {
    console.error('Error fetching squad info:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
