// Compile-only contracts: no client is instantiated and no requests are sent.
import type { SupabaseClient, QueryData } from "@supabase/supabase-js";
import type { Database, TablesInsert, TablesUpdate } from "../integrations/supabase/types";

declare const db: SupabaseClient<Database>;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Assert<T extends true> = T;

const localPrices = db.from("jeweler_feed").select("gold_gram,silver_gram,buyback_gram,silver_buyback_gram,source,fetched_at");
type GoldIsNullableNumber = Assert<Equal<QueryData<typeof localPrices>[number]["gold_gram"], number | null>>;
type SilverBuybackIsNullableNumber = Assert<Equal<QueryData<typeof localPrices>[number]["silver_buyback_gram"], number | null>>;
type SourceIsString = Assert<Equal<QueryData<typeof localPrices>[number]["source"], string>>;

const official = db.from("official_nisab").select("country,gold_nisab,silver_nisab,announced_on");
type NisabIsNullableNumber = Assert<Equal<QueryData<typeof official>[number]["gold_nisab"], number | null>>;
const history = db.from("nisab_history").select("day,gold_nisab,silver_nisab,source");
type HistoryDayIsString = Assert<Equal<QueryData<typeof history>[number]["day"], string>>;
const sources = db.from("official_sources").select("last_error,last_value,last_checked");
type SourceErrorIsString = Assert<Equal<QueryData<typeof sources>[number]["last_error"], string>>;

const votes = db.from("price_votes").select("submission_id,user_id,vote");
type VoteIsNumber = Assert<Equal<QueryData<typeof votes>[number]["vote"], number>>;
const board = db.rpc("jeweler_leaderboard", { _country: "EG" });
type BoardPointsAreNumber = Assert<Equal<QueryData<typeof board>[number]["points"], number>>;

const submission = { user_id: "user", country: "EG", currency: "EGP", gold_gram: 100, silver_gram: null } satisfies TablesInsert<"price_submissions">;
db.from("price_submissions").insert(submission);
const readNotification = { read_at: "2026-10-22T12:17:00Z" } satisfies TablesUpdate<"notifications">;
db.from("notifications").update(readNotification);
db.from("notification_prefs").upsert({ user_id: "user", countries: ["EG"], metals: ["gold", "silver"], in_app: true });
db.rpc("has_role", { _user_id: "user", _role: "admin" });

// These must remain errors; unused @ts-expect-error directives fail the contract test.
// @ts-expect-error unknown table
db.from("missing_table");
// @ts-expect-error required user_id missing
db.from("price_votes").insert({ submission_id: "submission", vote: 1 });
// @ts-expect-error prices are numeric, not strings
db.from("price_submissions").insert({ user_id: "user", country: "EG", currency: "EGP", gold_gram: "100" });
// @ts-expect-error notification read_at is a nullable timestamp, not a boolean
db.from("notifications").update({ read_at: true });
// @ts-expect-error country preference must be an array
db.from("notification_prefs").upsert({ user_id: "user", countries: "EG" });
// @ts-expect-error nonexistent RPC argument
db.rpc("jeweler_leaderboard", { country: "EG" });
// @ts-expect-error invalid role enum
db.rpc("has_role", { _user_id: "user", _role: "super_admin" });
// @ts-expect-error unselected column must not be accessible
type UnselectedColumn = QueryData<typeof votes>[number]["created_at"];