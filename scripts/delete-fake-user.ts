import { db, schema } from "../src/db";
import { eq, or, and } from "drizzle-orm";

async function main() {
  const targetUid = "c1f71a90-3bf7-49fe-8411-692654d32abb";
  console.log(`Starting cleanup for target user: ${targetUid}`);

  await db.transaction(async (tx) => {
    // 1. Get the target user info
    const [user] = await tx.select().from(schema.users).where(eq(schema.users.id, targetUid));
    if (!user) {
      console.log(`User ${targetUid} not found. Already deleted or wrong ID.`);
      return;
    }
    const sponsorId = user.sponsorId;
    console.log(`Found target user. Name: ${user.name}, Sponsor: ${sponsorId}`);

    // 2. Find transactions that gave bonuses/credits to others
    const sponsorTx = await tx.query.transactions.findFirst({
      where: and(
        eq(schema.transactions.userId, sponsorId || ""),
        eq(schema.transactions.counterpartyId, targetUid),
        eq(schema.transactions.type, "referral_bonus")
      )
    });

    if (sponsorTx && sponsorId) {
      console.log(`Reverting sponsor bonus of ${sponsorTx.points} points for sponsor ${sponsorId}...`);
      const [sponsor] = await tx.select().from(schema.users).where(eq(schema.users.id, sponsorId));
      if (sponsor) {
        const newBalance = sponsor.pointsBalance - sponsorTx.points;
        await tx.update(schema.users).set({ pointsBalance: newBalance }).where(eq(schema.users.id, sponsorId));
        await tx.insert(schema.transactions).values({
          userId: sponsorId,
          type: "referral_bonus",
          points: -sponsorTx.points,
          balanceAfter: newBalance,
          counterpartyId: targetUid,
          note: `Reverted sponsor bonus for deleted fake user ${user.name}`
        });
        console.log(`Sponsor points balance updated from ${sponsor.pointsBalance} to ${newBalance}`);
      }
    }

    // 3. Find slots Rishav filled
    const occupiedSlots = await tx.select().from(schema.slots).where(eq(schema.slots.occupantId, targetUid));
    for (const slot of occupiedSlots) {
      console.log(`Reverting occupied slot ID ${slot.id} (Owner: ${slot.ownerId})...`);
      
      // Update the slot to open/unfilled
      await tx.update(schema.slots).set({
        status: "open",
        occupantId: null,
        filledAt: null
      }).where(eq(schema.slots.id, slot.id));

      // Find the corresponding slot_credit transaction for the slot owner
      const ownerTx = await tx.query.transactions.findFirst({
        where: and(
          eq(schema.transactions.userId, slot.ownerId),
          eq(schema.transactions.counterpartyId, targetUid),
          eq(schema.transactions.type, "slot_credit"),
          eq(schema.transactions.slabLevel, slot.slabLevel)
        )
      });

      if (ownerTx) {
        console.log(`Deducting ${ownerTx.points} points from slot owner ${slot.ownerId}...`);
        const [owner] = await tx.select().from(schema.users).where(eq(schema.users.id, slot.ownerId));
        if (owner) {
          const newBalance = owner.pointsBalance - ownerTx.points;
          await tx.update(schema.users).set({ pointsBalance: newBalance }).where(eq(schema.users.id, slot.ownerId));
          await tx.insert(schema.transactions).values({
            userId: slot.ownerId,
            type: "slot_credit",
            points: -ownerTx.points,
            balanceAfter: newBalance,
            counterpartyId: targetUid,
            slabLevel: slot.slabLevel,
            note: `Reverted slot credit for deleted fake user ${user.name}`
          });
          console.log(`Slot owner points balance updated from ${owner.pointsBalance} to ${newBalance}`);
        }
      }
    }

    // 4. Delete target user's own open slots
    const deletedSlots = await tx.delete(schema.slots).where(eq(schema.slots.ownerId, targetUid));
    console.log(`Deleted slots owned by target user.`);

    // 5. Delete all transactions of the target user (as user or counterparty)
    await tx.delete(schema.transactions).where(
      or(
        eq(schema.transactions.userId, targetUid),
        eq(schema.transactions.counterpartyId, targetUid)
      )
    );
    console.log(`Deleted transactions linked to target user.`);

    // 6. Delete all crypto transactions of target user
    await tx.delete(schema.cryptoTransactions).where(eq(schema.cryptoTransactions.userId, targetUid));
    console.log(`Deleted crypto transactions linked to target user.`);

    // 7. Delete target user account
    await tx.delete(schema.users).where(eq(schema.users.id, targetUid));
    console.log(`Deleted user account record.`);
  });

  console.log("Cleanup completed successfully!");
}

main().catch(console.error);
