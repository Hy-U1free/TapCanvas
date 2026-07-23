import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../../types";
import * as teamRepo from "./team.repo";

type GrantTeamSignupBonusOnce = (
	db: PrismaClient,
	input: {
		teamId: string;
		amount: number;
		actorUserId: string;
		nowIso: string;
	},
) => Promise<boolean>;

describe("grantTeamSignupBonusOnce", () => {
	it("increments credits once across concurrent grants with the same idempotency key", async () => {
		const grantTeamSignupBonusOnce = (
			teamRepo as unknown as {
				grantTeamSignupBonusOnce?: GrantTeamSignupBonusOnce;
			}
		).grantTeamSignupBonusOnce;
		expect(grantTeamSignupBonusOnce).toBeTypeOf("function");
		if (!grantTeamSignupBonusOnce) return;

		const ledgerKeys = new Set<string>();
		const attemptedIdempotencyKeys: string[] = [];
		let credits = 0;
		let db: PrismaClient;
		const queryRaw = vi.fn(
			async (sql: string, ...bindings: unknown[]): Promise<unknown[]> => {
				if (sql.includes("information_schema.columns")) {
					const table = String(bindings[0] ?? "");
					if (table === "teams") return [{ name: "credits_frozen" }];
					if (table === "team_invites") return [{ name: "phone" }];
					return [];
				}
				if (!sql.includes("INSERT INTO team_credit_ledger")) return [];

				const teamId = String(bindings[1] ?? "");
				const idempotencyKey = String(bindings[3] ?? "");
				attemptedIdempotencyKeys.push(idempotencyKey);
				const uniqueKey = `${teamId}:topup:${idempotencyKey}`;
				if (ledgerKeys.has(uniqueKey)) return [];
				ledgerKeys.add(uniqueKey);
				return [{ id: String(bindings[0] ?? "") }];
			},
		);
		const executeRaw = vi.fn(
			async (sql: string, ...bindings: unknown[]): Promise<number> => {
				if (/UPDATE teams\s+SET credits = credits \+/m.test(sql)) {
					credits += Number(bindings[0] ?? 0);
					return 1;
				}
				return 0;
			},
		);
		db = {
			$queryRawUnsafe: queryRaw,
			$executeRawUnsafe: executeRaw,
			$transaction: vi.fn(
				async (operation: (client: PrismaClient) => Promise<unknown>) => operation(db),
			),
		} as unknown as PrismaClient;

		const input = {
			teamId: "personal_user-1",
			amount: 100,
			actorUserId: "user-1",
			nowIso: "2026-07-13T00:00:00.000Z",
		};
		const results = await Promise.all([
			grantTeamSignupBonusOnce(db, input),
			grantTeamSignupBonusOnce(db, input),
		]);

		expect(results.sort()).toEqual([false, true]);
		expect(credits).toBe(100);
		expect(ledgerKeys).toHaveLength(1);
		expect(attemptedIdempotencyKeys).toEqual([
			"signup_bonus:user-1",
			"signup_bonus:user-1",
		]);
	});
});
