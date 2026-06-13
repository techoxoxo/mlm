import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
  pgEnum,
  uniqueIndex,
  index,
  serial,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

/* ------------------------------------------------------------------ enums */

export const userRole = pgEnum("user_role", ["user", "admin"]);
export const userStatus = pgEnum("user_status", [
  "registered", // paid join fee, not yet activated
  "active", // activated into slab 1+
  "exited", // took an exit payout and left
  "completed", // cleared the final slab and cashed out
]);
export const slotStatus = pgEnum("slot_status", ["open", "filled"]);
export const txType = pgEnum("tx_type", [
  "join_fee",
  "activation_fee",
  "upgrade_fee",
  "slot_credit", // points earned when a downline fills your slot
  "referral_bonus", // points earned for a direct referral
  "exit_payout",
  "upgrade_take", // the % you pocket when you choose to upgrade
  "company_fee", // the house cut
  "adjustment", // manual admin adjustment
]);
export const choiceStatus = pgEnum("choice_status", [
  "pending",
  "exited",
  "upgraded",
]);

/* ------------------------------------------------------------------ settings (singleton) */

export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  joinFee: integer("join_fee").notNull().default(10),
  // global default cut taken by the house on every slot credit (percent 0-100)
  companyPercent: integer("company_percent").notNull().default(0),
  // whether new activations auto-place into the global FIFO pool
  autoPlace: boolean("auto_place").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ------------------------------------------------------------------ slabs (admin-configurable) */

export const slabs = pgTable("slabs", {
  level: integer("level").primaryKey(), // 1..N
  name: text("name").notNull(),
  fee: integer("fee").notNull(), // cost to activate/upgrade into this slab
  slots: integer("slots").notNull(), // members required (2,4,8,16,32)
  referralBonus: integer("referral_bonus").notNull().default(0), // per direct referral
  // when this slab fills, what % of points collected the user may take
  exitPercent: integer("exit_percent").notNull().default(30),
  // if they upgrade instead, the % they pocket (rest funds the upgrade)
  upgradeTakePercent: integer("upgrade_take_percent").notNull().default(25),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

/* ------------------------------------------------------------------ users */

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    role: userRole("role").notNull().default("user"),
    status: userStatus("status").notNull().default("registered"),

    // who referred this user (drives the referral bonus). null = root signup.
    sponsorId: uuid("sponsor_id"),
    referralCode: text("referral_code").notNull(),

    // 0 = registered only. 1..N = current active slab.
    currentSlab: integer("current_slab").notNull().default(0),
    // when the user's current slab is full, this holds the level awaiting a choice
    pendingChoiceSlab: integer("pending_choice_slab"),

    // cached balance; the ledger is the source of truth
    pointsBalance: integer("points_balance").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    exitedAt: timestamp("exited_at", { withTimezone: true }),
  },
  (t) => ({
    emailIdx: uniqueIndex("users_email_idx").on(t.email),
    refCodeIdx: uniqueIndex("users_referral_code_idx").on(t.referralCode),
    sponsorIdx: index("users_sponsor_idx").on(t.sponsorId),
  }),
);

/* ------------------------------------------------------------------ slots (the FIFO matrix queue) */

export const slots = pgTable(
  "slots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").notNull(), // upline who earns when this fills
    slabLevel: integer("slab_level").notNull(),
    position: integer("position").notNull(), // 1..slab.slots
    status: slotStatus("status").notNull().default("open"),
    occupantId: uuid("occupant_id"), // downline who filled it
    // monotonic ordering for FIFO — lower = earlier in queue
    queueSeq: serial("queue_seq").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    filledAt: timestamp("filled_at", { withTimezone: true }),
  },
  (t) => ({
    // the hot path: find the oldest open slot at a level
    fifoIdx: index("slots_fifo_idx").on(t.slabLevel, t.status, t.queueSeq),
    ownerIdx: index("slots_owner_idx").on(t.ownerId, t.slabLevel),
  }),
);

/* ------------------------------------------------------------------ ledger (append-only) */

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    type: txType("type").notNull(),
    points: integer("points").notNull(), // signed: +credit / -debit
    balanceAfter: integer("balance_after").notNull(),
    counterpartyId: uuid("counterparty_id"), // e.g. the member who filled the slot
    slabLevel: integer("slab_level"),
    note: text("note"),
    meta: jsonb("meta"),
    idempotencyKey: text("idempotency_key"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userIdx: index("tx_user_idx").on(t.userId, t.createdAt),
    // serves the per-slab "collected" sums in the engine and dashboard
    userSlabIdx: index("tx_user_slab_idx").on(t.userId, t.slabLevel),
    idemIdx: uniqueIndex("tx_idem_idx").on(t.idempotencyKey),
  }),
);

/* ------------------------------------------------------------------ slab completion choices */

export const slabCompletions = pgTable(
  "slab_completions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    slabLevel: integer("slab_level").notNull(),
    collected: integer("collected").notNull(), // points gathered at this slab
    status: choiceStatus("status").notNull().default("pending"),
    payout: integer("payout"), // points paid on the decision
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
  },
  (t) => ({
    userIdx: index("completions_user_idx").on(t.userId),
    uniqIdx: uniqueIndex("completions_uniq_idx").on(t.userId, t.slabLevel),
  }),
);

/* ------------------------------------------------------------------ relations */

export const usersRelations = relations(users, ({ one, many }) => ({
  sponsor: one(users, {
    fields: [users.sponsorId],
    references: [users.id],
    relationName: "sponsor",
  }),
  referrals: many(users, { relationName: "sponsor" }),
  transactions: many(transactions),
  ownedSlots: many(slots),
}));

export const slotsRelations = relations(slots, ({ one }) => ({
  owner: one(users, { fields: [slots.ownerId], references: [users.id] }),
  occupant: one(users, { fields: [slots.occupantId], references: [users.id] }),
}));

/* ------------------------------------------------------------------ inferred types */

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Slab = typeof slabs.$inferSelect;
export type Slot = typeof slots.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type SlabCompletion = typeof slabCompletions.$inferSelect;

export const sqlNow = sql`now()`;
