import "dotenv/config";
import { db, pool as pgPool } from "./index";
import { settings, slabs, users, pools, royaltyTiers } from "./schema";
import { hashPassword, genReferralCode } from "@/lib/auth";
import { eq } from "drizzle-orm";

// Stage 1: 100% exit (or upgrade keeping 25%). Stages 2-4: 30% exit.
// Stage 5 (final): full payout, handled in code.
const SLABS = [
  { level: 1, name: "Starter", fee: 30, slots: 2, referralBonus: 0, exitPercent: 100, upgradeTakePercent: 25 },
  { level: 2, name: "Bronze", fee: 50, slots: 4, referralBonus: 0, exitPercent: 30, upgradeTakePercent: 25 },
  { level: 3, name: "Silver", fee: 150, slots: 8, referralBonus: 0, exitPercent: 30, upgradeTakePercent: 25 },
  { level: 4, name: "Gold", fee: 1000, slots: 16, referralBonus: 0, exitPercent: 30, upgradeTakePercent: 25 },
  { level: 5, name: "Platinum", fee: 10000, slots: 32, referralBonus: 0, exitPercent: 100, upgradeTakePercent: 25 },
];

const ROYALTY_TIERS = [
  { minDirects: 10, percent: 10, label: "Bronze rank" },
  { minDirects: 25, percent: 12, label: "Silver rank" },
  { minDirects: 50, percent: 18, label: "Gold rank" },
  { minDirects: 100, percent: 25, label: "Platinum rank" },
  { minDirects: 200, percent: 30, label: "Diamond rank" },
];

async function main() {
  console.log("Seeding settings…");
  await db
    .insert(settings)
    .values({ id: 1, idPinFee: 10, sponsorReward: 5, royaltyFee: 10, royaltyReservePercent: 5, reserveInactivityMonths: 6, companyPercent: 0, autoPlace: true })
    .onConflictDoUpdate({
      target: settings.id,
      set: { idPinFee: 10, sponsorReward: 5, royaltyFee: 10, royaltyReservePercent: 5, reserveInactivityMonths: 6 },
    });

  console.log("Seeding pools…");
  await db.insert(pools).values({ id: 1 }).onConflictDoNothing();

  console.log("Seeding royalty tiers…");
  for (const t of ROYALTY_TIERS) {
    await db
      .insert(royaltyTiers)
      .values(t)
      .onConflictDoUpdate({ target: royaltyTiers.minDirects, set: { percent: t.percent, label: t.label } });
  }

  console.log("Seeding slabs…");
  for (const s of SLABS) {
    await db
      .insert(slabs)
      .values({ ...s, sortOrder: s.level, active: true })
      .onConflictDoUpdate({
        target: slabs.level,
        set: { name: s.name, fee: s.fee, slots: s.slots, referralBonus: s.referralBonus, exitPercent: s.exitPercent, upgradeTakePercent: s.upgradeTakePercent },
      });
  }

  console.log("Seeding admin user…");
  const adminEmail = "info@revolutionary-group.com";
  const existing = await db.query.users.findFirst({ where: eq(users.email, adminEmail) });
  if (!existing) {
    await db.insert(users).values({
      email: adminEmail,
      passwordHash: await hashPassword("adminRevolution@369"),
      name: "Administrator",
      role: "admin",
      status: "active",
      referralCode: genReferralCode(),
    });
    console.log("  → info@revolutionary-group.com / adminRevolution@369");
  } else {
    console.log("  → admin already exists");
  }

  console.log("Seed complete.");
  await pgPool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
