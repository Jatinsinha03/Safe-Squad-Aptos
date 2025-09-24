import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ walletAddress: string }> }
) {
  try {
    const { walletAddress } = await params

    // Validate wallet address format
    const walletRegex = /^0x[a-fA-F0-9]{64}$/
    if (!walletRegex.test(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      )
    }

    // Get all invites for this wallet address
    const invites = await prisma.squadInvite.findMany({
      where: { inviteeWallet: walletAddress },
      include: {
        creator: true,
        invitee: true
      },
      orderBy: { createdAt: 'desc' }
    })

    // Process invites and check for expired ones
    const processedInvites = await Promise.all(
      invites.map(async (invite) => {
        // Check if invite has expired
        if (invite.status === 'PENDING' && new Date() > invite.expiresAt) {
          // Update expired invite
          const updatedInvite = await prisma.squadInvite.update({
            where: { id: invite.id },
            data: { status: 'EXPIRED' }
          })
          return {
            ...updatedInvite,
            creator: invite.creator,
            invitee: invite.invitee
          }
        }
        return invite
      })
    )

    return NextResponse.json({
      success: true,
      walletAddress,
      invites: processedInvites.map(invite => ({
        id: invite.id,
        squadName: invite.squadName,
        creatorWallet: invite.creatorWallet,
        inviteeWallet: invite.inviteeWallet,
        status: invite.status,
        expiresAt: invite.expiresAt,
        createdAt: invite.createdAt,
        updatedAt: invite.updatedAt
      }))
    })

  } catch (error) {
    console.error('Error fetching invites:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
