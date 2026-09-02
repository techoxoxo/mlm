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
  numeric,
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
  "id_pin_fee", // 10pt registration fee → system
  "royalty_fee", // 10pt registration contribution → royalty pool
  "activation_fee",
  "upgrade_fee",
  "slot_credit", // points earned when a downline fills your slot
  "referral_bonus", // points earned for a direct referral
  "exit_payout",
  "upgrade_take", // the % you pocket when you choose to upgrade
  "company_fee", // the house cut
  "royalty_payout", // rank-band royalty reward
  "royalty_reserve_reward", // 5% reserve reward to 6-month non-achievers
  "adjustment", // manual admin adjustment
  "usdt_deposit", // purchase points via NowPayments USDT
  "usdt_withdrawal", // convert points back to USDT payout
  "roi_investment", // moved from wallet balance into an ROI plan investment
  "roi_direct_income", // 10% paid to sponsor when a direct invests in the ROI plan
  "roi_daily_payout", // daily ROI credit on an active investment
  "roi_level_income", // "ROI of ROI" — share of a downline's daily ROI, 20 levels deep
]);
export const choiceStatus = pgEnum("choice_status", [
  "pending",
  "exited",
  "upgraded",
]);
export const cryptoTxStatus = pgEnum("crypto_tx_status", [
  "pending",
  "pending_admin_approval",
  "processing",
  "completed",
  "failed",
  "expired",
]);
export const cryptoTxType = pgEnum("crypto_tx_type", ["deposit", "withdrawal"]);

/* ------------------------------------------------------------------ settings (singleton) */

export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  joinFee: integer("join_fee").notNull().default(10), // legacy; unused with split registration
  // registration breakdown — total = idPinFee + slab1.fee (autopool) + royaltyFee
  idPinFee: integer("id_pin_fee").notNull().default(10),
  // portion of the ID-PIN fee paid to the sponsor (rest is the system's take;
  // direct signups with no sponsor send the whole id_pin_fee to the system)
  sponsorReward: integer("sponsor_reward").notNull().default(5),
  royaltyFee: integer("royalty_fee").notNull().default(10),
  // % of the royalty pool held back on each distribution for the reserve fund
  royaltyReservePercent: integer("royalty_reserve_percent").notNull().default(5),
  // months of no stage-clear that qualifies a user for a reserve reward
  reserveInactivityMonths: integer("reserve_inactivity_months").notNull().default(6),
  // global default cut taken by the house on every slot credit (percent 0-100)
  companyPercent: integer("company_percent").notNull().default(0),
  // whether new activations auto-place into the global FIFO pool
  autoPlace: boolean("auto_place").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ------------------------------------------------------------------ pools (singleton) */

export const pools = pgTable("pools", {
  id: integer("id").primaryKey().default(1),
  royaltyPool: integer("royalty_pool").notNull().default(0), // undistributed royalty points
  royaltyReserve: integer("royalty_reserve").notNull().default(0), // 5% safety fund
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ royalty rank tiers (admin-configurable) */

export const royaltyTiers = pgTable("royalty_tiers", {
  minDirects: integer("min_directs").primaryKey(), // 10, 25, 50, 100, 200
  percent: integer("percent").notNull(), // share of the pool for this band
  label: text("label").notNull(),
});

/* ------------------------------------------------------------------ royalty distribution audit */

export const royaltyRuns = pgTable("royalty_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  poolBefore: integer("pool_before").notNull(),
  reserveAdded: integer("reserve_added").notNull(),
  rankDistributed: integer("rank_distributed").notNull(),
  reserveDistributed: integer("reserve_distributed").notNull(),
  rankRecipients: integer("rank_recipients").notNull(),
  reserveRecipients: integer("reserve_recipients").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const royaltyPayouts = pgTable(
  "royalty_payouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id").notNull(),
    userId: uuid("user_id").notNull(),
    kind: text("kind").notNull(), // 'rank' | 'reserve'
    directs: integer("directs"),
    bandPercent: integer("band_percent"),
    amount: integer("amount").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    runIdx: index("royalty_payouts_run_idx").on(t.runId),
    userIdx: index("royalty_payouts_user_idx").on(t.userId),
  }),
);

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
    // human-friendly sequential member number → rendered as APX-000123
    serialNo: serial("serial_no").notNull(),
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
    // royalty bookkeeping
    lastStageClearedAt: timestamp("last_stage_cleared_at", { withTimezone: true }),
    lastReserveRewardAt: timestamp("last_reserve_reward_at", { withTimezone: true }),

    // automatic admin-driven slab upgrading
    autoUpgrade: boolean("auto_upgrade").notNull().default(false),

    // ROI plan bookkeeping — independent of the slab/autopool/royalty system above.
    // roiInvested is the lifetime sum of this user's active ROI-plan investments;
    // every payout from that plan (direct/daily/level income) is capped at
    // roiInvested * roiSettings.capMultiplier, tracked via roiEarned.
    roiInvested: integer("roi_invested").notNull().default(0),
    // full-precision lifetime earnings (direct + daily + level income combined),
    // used for cap math — daily/level rates on modest investments round to
    // literal $0/day as whole dollars, so this must stay fractional or the
    // plan pays nothing. See roiWalletCredited for the whole-dollar portion
    // that's actually been moved into the spendable points wallet.
    roiEarned: numeric("roi_earned", { precision: 18, scale: 6 }).notNull().default("0"),
    // how many whole dollars of roiEarned have already been settled into
    // pointsBalance via post() — the fractional remainder (roiEarned - this)
    // stays parked here until it crosses another whole dollar.
    roiWalletCredited: integer("roi_wallet_credited").notNull().default(0),
    // every direct/daily/level income event splits 50/50 — this half accrues
    // here as Token (tracked/displayed only, no withdrawal yet, so no
    // wallet-settlement counterpart like roiWalletCredited). Counts toward
    // the same cap as roiEarned — the cap is on combined earnings, not just
    // the USDT half.
    roiTokenEarned: numeric("roi_token_earned", { precision: 18, scale: 6 }).notNull().default("0"),
    // cumulative investment total of this user's DIRECT referrals in the ROI
    // plan — crossing roiSettings.boostThresholdUsdt permanently unlocks the
    // boosted daily rate (roiBoosted stays true even if directs later change).
    roiDirectTotal: integer("roi_direct_total").notNull().default(0),
    roiBoosted: boolean("roi_boosted").notNull().default(false),
    roiBoostedAt: timestamp("roi_boosted_at", { withTimezone: true }),
  },
  (t) => ({
    emailIdx: uniqueIndex("users_email_idx").on(t.email),
    refCodeIdx: uniqueIndex("users_referral_code_idx").on(t.referralCode),
    serialIdx: uniqueIndex("users_serial_idx").on(t.serialNo),
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
  cryptoTransactions: many(cryptoTransactions),
}));

export const slotsRelations = relations(slots, ({ one }) => ({
  owner: one(users, { fields: [slots.ownerId], references: [users.id] }),
  occupant: one(users, { fields: [slots.occupantId], references: [users.id] }),
}));

/* ------------------------------------------------------------------ crypto transactions */

export const cryptoGateway = pgEnum("crypto_gateway", [
  "razcrypto",
  "nowpayments",
  "oxapay",
  "cryptomus",
]);

export const cryptoTransactions = pgTable("crypto_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  type: cryptoTxType("type").notNull(),
  status: cryptoTxStatus("status").notNull().default("pending"),
  amountUsdt: numeric("amount_usdt", { precision: 18, scale: 6 }).notNull(),
  amountPoints: integer("amount_points").notNull(),
  feeUsdt: numeric("fee_usdt", { precision: 18, scale: 6 }).notNull().default("0.000000"),
  network: text("network").notNull(),
  gateway: cryptoGateway("gateway").notNull().default("razcrypto"),
  paymentId: text("payment_id"),
  txHash: text("tx_hash"),
  encryptedWalletAddress: text("encrypted_wallet_address"),
  hashedWalletAddress: text("hashed_wallet_address"),
  // admin audit trail for manual approval / rejection
  approvedByAdminId: uuid("approved_by_admin_id"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  rejectedByAdminId: uuid("rejected_by_admin_id"),
  rejectedAt: timestamp("rejected_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userIdx: index("crypto_tx_user_idx").on(t.userId),
  paymentIdx: uniqueIndex("crypto_tx_payment_idx").on(t.paymentId),
}));

export const cryptoTransactionsRelations = relations(cryptoTransactions, ({ one }) => ({
  user: one(users, { fields: [cryptoTransactions.userId], references: [users.id] }),
}));

/* ------------------------------------------------------------------ audit log (append-only admin action trail) */

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    adminId: uuid("admin_id").notNull(),
    action: text("action").notNull(), // e.g. 'update_settings', 'approve_withdrawal', 'reset_system'
    targetType: text("target_type"), // e.g. 'user', 'settings', 'slab', 'royalty_tier', 'crypto_transaction'
    targetId: text("target_id"), // id of the affected entity
    before: jsonb("before"), // snapshot before the change
    after: jsonb("after"), // snapshot after the change
    ipAddress: text("ip_address"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    adminIdx: index("audit_log_admin_idx").on(t.adminId),
    actionIdx: index("audit_log_action_idx").on(t.action),
    targetIdx: index("audit_log_target_idx").on(t.targetType, t.targetId),
    createdIdx: index("audit_log_created_idx").on(t.createdAt),
  }),
);

/* ------------------------------------------------------------------ balance reconciliation log */

export const reconciliationRuns = pgTable("reconciliation_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  totalUsers: integer("total_users").notNull(),
  mismatchCount: integer("mismatch_count").notNull(),
  mismatches: jsonb("mismatches"), // [{ userId, cached, calculated, drift }]
  autoFixed: boolean("auto_fixed").notNull().default(false),
  triggeredBy: text("triggered_by").notNull(), // 'cron' | 'admin'
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ ROI plan (independent of the slab/autopool/royalty system) */

export const roiSettings = pgTable("roi_settings", {
  id: integer("id").primaryKey().default(1),
  // master switch — while off, the dashboard shows "coming soon" and no
  // investment (manual, direct-payment, or otherwise) is accepted
  enabled: boolean("enabled").notNull().default(false),
  minInvest: integer("min_invest").notNull().default(100),
  maxInvest: integer("max_invest").notNull().default(2000),
  investStep: integer("invest_step").notNull().default(100),
  // daily rate before/after the direct-investment boost, e.g. '0.300' = 0.3%/day
  baseDailyRoiPercent: numeric("base_daily_roi_percent", { precision: 5, scale: 3 }).notNull().default("0.300"),
  boostedDailyRoiPercent: numeric("boosted_daily_roi_percent", { precision: 5, scale: 3 }).notNull().default("0.500"),
  directIncomePercent: integer("direct_income_percent").notNull().default(10),
  // cumulative direct-referral investment (USDT) needed to permanently unlock the boosted rate
  boostThresholdUsdt: integer("boost_threshold_usdt").notNull().default(2500),
  // every income stream (direct + daily ROI + level income) stops once a
  // user's total ROI-plan earnings reach investment * capMultiplier
  capMultiplier: integer("cap_multiplier").notNull().default(3),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// "ROI of ROI" — a share of a downline's daily ROI payout, 20 levels deep.
export const roiLevelTiers = pgTable("roi_level_tiers", {
  level: integer("level").primaryKey(), // 1..20
  percent: numeric("percent", { precision: 5, scale: 3 }).notNull(),
});

export const roiInvestments = pgTable(
  "roi_investments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    amount: integer("amount").notNull(), // 100-2000 USDT, multiples of 100
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("roi_investments_user_idx").on(t.userId),
  }),
);

export const roiInvestmentsRelations = relations(roiInvestments, ({ one }) => ({
  user: one(users, { fields: [roiInvestments.userId], references: [users.id] }),
}));

export const roiTxType = pgEnum("roi_tx_type", ["direct_income", "daily_payout", "level_income"]);

/**
 * Full-precision, append-only decimal ledger for ROI plan earnings — separate
 * from the shared integer `transactions` table (used elsewhere in the app),
 * because daily/level percentages on modest investments are routinely worth
 * less than $1 and would round to $0 forever under integer-only accounting.
 * A row here is always inserted for every accrual event (even a $0.03 one),
 * which is also what makes daily distribution idempotent per calendar day —
 * see roiWalletCredited on `users` for how whole dollars get settled into the
 * real withdrawable balance.
 */
export const roiTransactions = pgTable(
  "roi_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    type: roiTxType("type").notNull(),
    points: numeric("points", { precision: 18, scale: 6 }).notNull(),
    counterpartyId: uuid("counterparty_id"),
    investmentId: uuid("investment_id"),
    level: integer("level"),
    note: text("note"),
    idempotencyKey: text("idempotency_key"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("roi_transactions_user_idx").on(t.userId, t.createdAt),
    idemIdx: uniqueIndex("roi_tx_idem_idx").on(t.idempotencyKey),
  }),
);

/* ------------------------------------------------------------------ support tickets */

export const supportTickets = pgTable("support_tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  subject: text("subject").notNull(),
  category: text("category").notNull(), // 'payment' | 'matrix' | 'bug' | 'other'
  status: text("status").notNull().default("open"), // 'open' | 'answered' | 'closed'
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userIdx: index("support_ticket_user_idx").on(t.userId),
  statusIdx: index("support_ticket_status_idx").on(t.status),
}));

export const supportMessages = pgTable("support_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticketId: uuid("ticket_id").notNull(),
  senderId: uuid("sender_id").notNull(),
  role: text("role").notNull(), // 'user' | 'admin'
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  ticketIdx: index("support_msg_ticket_idx").on(t.ticketId),
}));

export const supportTicketsRelations = relations(supportTickets, ({ one, many }) => ({
  user: one(users, { fields: [supportTickets.userId], references: [users.id] }),
  messages: many(supportMessages),
}));

export const supportMessagesRelations = relations(supportMessages, ({ one }) => ({
  ticket: one(supportTickets, { fields: [supportMessages.ticketId], references: [supportTickets.id] }),
  sender: one(users, { fields: [supportMessages.senderId], references: [users.id] }),
}));

/* ------------------------------------------------------------------ inferred types */

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Slab = typeof slabs.$inferSelect;
export type Slot = typeof slots.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type SlabCompletion = typeof slabCompletions.$inferSelect;
export type Pools = typeof pools.$inferSelect;
export type RoyaltyTier = typeof royaltyTiers.$inferSelect;
export type RoyaltyRun = typeof royaltyRuns.$inferSelect;
export type RoyaltyPayout = typeof royaltyPayouts.$inferSelect;
export type CryptoTransaction = typeof cryptoTransactions.$inferSelect;
export type NewCryptoTransaction = typeof cryptoTransactions.$inferInsert;
export type AuditLog = typeof auditLog.$inferSelect;
export type ReconciliationRun = typeof reconciliationRuns.$inferSelect;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type SupportMessage = typeof supportMessages.$inferSelect;
export type RoiSettings = typeof roiSettings.$inferSelect;
export type RoiLevelTier = typeof roiLevelTiers.$inferSelect;
export type RoiInvestment = typeof roiInvestments.$inferSelect;
export type RoiTransaction = typeof roiTransactions.$inferSelect;

export const sqlNow = sql`now()`;

/** Render a user's sequential number as a member code, e.g. 123 → "APX-000123". */
export function memberCode(serialNo: number): string {
  return `APX-${String(serialNo).padStart(6, "0")}`;
}
