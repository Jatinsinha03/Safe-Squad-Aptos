import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { inviteId, inviteeWallet } = await request.json()

    // Validate required fields
    if (!inviteId || !inviteeWallet) {
      return NextResponse.json(
        { error: 'Missing required fields: inviteId, inviteeWallet' },
        { status: 400 }
      )
    }

    // Find the invite
    const invite = await prisma.squadInvite.findUnique({
      where: { id: inviteId },
      include: {
        creator: true,
        invitee: true
      }
    })

    if (!invite) {
      return NextResponse.json(
        { error: 'Invite not found' },
        { status: 404 }
      )
    }

    // Verify the invitee wallet matches
    if (invite.inviteeWallet !== inviteeWallet) {
      return NextResponse.json(
        { error: 'Unauthorized: wallet address mismatch' },
        { status: 403 }
      )
    }

    // Check if invite is still pending
    if (invite.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Invite has already been ${invite.status.toLowerCase()}` },
        { status: 400 }
      )
    }

    // Check if invite has expired
    if (new Date() > invite.expiresAt) {
      // Update status to expired
      await prisma.squadInvite.update({
        where: { id: inviteId },
        data: { status: 'EXPIRED' }
      })

      return NextResponse.json(
        { error: 'Invite has expired' },
        { status: 400 }
      )
    }

    // Accept the invite
    const updatedInvite = await prisma.squadInvite.update({
      where: { id: inviteId },
      data: { status: 'ACCEPTED' },
      include: {
        creator: true,
        invitee: true
      }
    })

    // Check if all invites for this squad are now accepted
    const squadInvites = await prisma.squadInvite.findMany({
      where: {
        squadName: invite.squadName,
        creatorWallet: invite.creatorWallet
      }
    })

    const allAccepted = squadInvites.every(inv => inv.status === 'ACCEPTED')
    const totalInvites = squadInvites.length
    const acceptedCount = squadInvites.filter(inv => inv.status === 'ACCEPTED').length

    return NextResponse.json({
      success: true,
      invite: {
        id: updatedInvite.id,
        squadName: updatedInvite.squadName,
        creatorWallet: updatedInvite.creatorWallet,
        inviteeWallet: updatedInvite.inviteeWallet,
        status: updatedInvite.status,
        expiresAt: updatedInvite.expiresAt,
        createdAt: updatedInvite.createdAt,
        updatedAt: updatedInvite.updatedAt
      },
      squadStatus: {
        isComplete: allAccepted,
        totalInvites,
        acceptedInvites: acceptedCount,
        pendingInvites: totalInvites - acceptedCount
      }
    })

  } catch (error) {
    console.error('Error accepting invite:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
