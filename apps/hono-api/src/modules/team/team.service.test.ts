import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppContext } from "../../types";

const {
	createTeam,
	getTeamById,
	grantTeamSignupBonusOnce,
	topUpTeamCredits,
} = vi.hoisted(() => ({
	createTeam: vi.fn(),
	getTeamById: vi.fn(),
	grantTeamSignupBonusOnce: vi.fn(),
	topUpTeamCredits: vi.fn(),
}));

vi.mock("./team.repo", async () => {
	const actual = await vi.importActual<typeof import("./team.repo")>("./team.repo");
	return {
		...actual,
		createTeam,
		getTeamById,
		grantTeamSignupBonusOnce,
		topUpTeamCredits,
	};
});
import { grantSignupBonusToPersonalTeam } from "./team.service";

function createContext(): AppContext {
	return {
		env: { DB: {} } as AppContext["env"],
		get: () => ({ login: "tester" }),
	} as unknown as AppContext;
}

describe("grantSignupBonusToPersonalTeam", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createTeam.mockResolvedValue(undefined);
		getTeamById
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce({ id: "personal_user_1", credits: 0 });
		grantTeamSignupBonusOnce.mockResolvedValue(true);
		topUpTeamCredits.mockResolvedValue(undefined);
	});

	it("delegates signup bonus to the atomic idempotent grant", async () => {
		await grantSignupBonusToPersonalTeam(createContext(), "user-1");

		expect(grantTeamSignupBonusOnce).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				teamId: "personal_user-1",
				amount: 100,
				actorUserId: "user-1",
			}),
		);
		expect(topUpTeamCredits).not.toHaveBeenCalled();
	});

	it("accepts an already-granted result without a second topup path", async () => {
		grantTeamSignupBonusOnce.mockResolvedValue(false);

		await grantSignupBonusToPersonalTeam(createContext(), "user-1");

		expect(grantTeamSignupBonusOnce).toHaveBeenCalledTimes(1);
		expect(topUpTeamCredits).not.toHaveBeenCalled();
	});
});
