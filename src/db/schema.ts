import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "app_users",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    email: varchar("email", { length: 320 }).notNull(),
    displayName: varchar("display_name", { length: 120 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("app_users_email_idx").on(sql`lower(${table.email})`)],
);

export const sessions = pgTable(
  "app_sessions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 128 }).notNull(),
    userAgent: text("user_agent"),
    ipAddress: varchar("ip_address", { length: 96 }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("app_sessions_token_hash_idx").on(table.tokenHash),
    index("app_sessions_user_idx").on(table.userId),
    index("app_sessions_expiry_idx").on(table.expiresAt),
  ],
);

export const journals = pgTable(
  "app_journals",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 160 }).notNull(),
    template: varchar("template", { length: 60 }).notNull(),
    mood: varchar("mood", { length: 60 }).notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("app_journals_owner_updated_idx").on(table.ownerId, table.updatedAt),
    index("app_journals_template_idx").on(table.template),
  ],
);

export const aiRateLimits = pgTable(
  "app_ai_rate_limits",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    rateKey: varchar("rate_key", { length: 160 }).notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    requestCount: integer("request_count").notNull().default(1),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("app_ai_rate_limits_key_window_idx").on(table.rateKey, table.windowStart)],
);

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  journals: many(journals),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const journalsRelations = relations(journals, ({ one }) => ({
  owner: one(users, {
    fields: [journals.ownerId],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type Journal = typeof journals.$inferSelect;
