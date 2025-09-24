import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { squadName, creatorWallet, inviteeWallet, expiresInDays = 7 } = await request.json()

    // Validate required fields
    if (!squadName || !creatorWallet || !inviteeWallet) {
      return NextResponse.json(
        { error: 'Missing required fields: squadName, creatorWallet, inviteeWallet' },
        { status: 400 }
      )
    }

    // Validate wallet addresses (basic format check)
    const walletRegex = /^0x[a-fA-F0-9]{64}$/
    if (!walletRegex.test(creatorWallet) || !walletRegex.test(inviteeWallet)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      )
    }

    // Check if creator and invitee are the same
    if (creatorWallet === inviteeWallet) {
      return NextResponse.json(
        { error: 'Cannot invite yourself' },
        { status: 400 }
      )
    }

    // Calculate expiration date
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    // Check if invite already exists
    const existingInvite = await prisma.squadInvite.findUnique({
      where: {
        squadName_inviteeWallet: {
          squadName,
          inviteeWallet
        }
      }
    })

    if (existingInvite) {
      if (existingInvite.status === 'PENDING') {
        return NextResponse.json(
          { error: 'Invite already exists and is pending' },
          { status: 409 }
        )
      } else if (existingInvite.status === 'ACCEPTED') {
        return NextResponse.json(
          { error: 'User has already accepted an invite to this squad' },
          { status: 409 }
        )
      }
    }

    // Create or update profile for creator
    await prisma.profile.upsert({
      where: { walletAddress: creatorWallet },
      update: {},
      create: {
        walletAddress: creatorWallet
      }
    })

    // Create or update profile for invitee
    await prisma.profile.upsert({
      where: { walletAddress: inviteeWallet },
      update: {},
      create: {
        walletAddress: inviteeWallet
      }
    })

    // Create the invite
    const invite = await prisma.squadInvite.create({
      data: {
        squadName,
        creatorWallet,
        inviteeWallet,
        expiresAt,
        status: 'PENDING'
      },
      include: {
        creator: true,
        invitee: true
      }
    })

    return NextResponse.json({
      success: true,
      invite: {
        id: invite.id,
        squadName: invite.squadName,
        creatorWallet: invite.creatorWallet,
        inviteeWallet: invite.inviteeWallet,
        status: invite.status,
        expiresAt: invite.expiresAt,
        createdAt: invite.createdAt
      }
    })

  } catch (error) {
    console.error('Error creating invite:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
