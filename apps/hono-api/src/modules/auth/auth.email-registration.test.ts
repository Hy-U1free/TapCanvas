import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppContext } from "../../types";

const { config, getConfig, prisma, signJwtHS256, grantSignupBonusToPersonalTeam } =
	vi.hoisted(() => {
		const config = {
			jwtSecret: "test-jwt-secret",
			githubClientId: null,
			githubClientSecret: null,
			loginUrl: null,
			resendApiKey: "re_test",
			resendFrom: "TapCanvas <auth@example.com>",
			emailLoginDebug: false,
			phoneLoginDebug: false,
			authOtpPepper: "test-otp-pepper",
			aliyunSmsAccessKeyId: null,
			aliyunSmsAccessKeySecret: null,
			aliyunSmsSignName: null,
			aliyunSmsTemplateCode: null,
			aliyunSmsEndpoint: null,
		};
		return {
			config,
			getConfig: vi.fn(() => config),
			signJwtHS256: vi.fn(async () => "mock-token"),
			grantSignupBonusToPersonalTeam: vi.fn(async () => undefined),
			prisma: {
				$transaction: vi.fn(),
				email_login_codes: {
					count: vi.fn(),
					findFirst: vi.fn(),
					create: vi.fn(),
					updateMany: vi.fn(),
				},
				users: {
					findMany: vi.fn(),
					findUnique: vi.fn(),
					create: vi.fn(),
					update: vi.fn(),
					updateMany: vi.fn(),
				},
			},
		};
	});

vi.mock("../../platform/node/prisma", () => ({
	getPrismaClient: () => prisma,
}));

vi.mock("../../config", () => ({ getConfig }));
vi.mock("../../jwt", () => ({ signJwtHS256 }));
vi.mock("../team/team.service", () => ({ grantSignupBonusToPersonalTeam }));
vi.mock("./local-admin", () => ({
	resolveLocalDevRole: (_c: AppContext, role: string | null) => role,
}));

import {
	loginWithEmailPassword,
	requestEmailRegistrationCode,
	verifyEmailRegistration,
} from "./auth.service";
import { createPasswordRecord } from "./password";

function createContext(
	nodeEnv: "development" | "production" | null = "development",
): AppContext {
	return {
		env: {
			JWT_SECRET: "test-jwt-secret",
			...(nodeEnv ? { NODE_ENV: nodeEnv } : {}),
		} as unknown as AppContext["env"],
		req: {
			header: () => undefined,
			url: "https://example.com/auth/email/register/request",
		} as unknown as AppContext["req"],
		json: (body: unknown, status?: number) =>
			new Response(JSON.stringify(body), {
				status: status ?? 200,
				headers: { "Content-Type": "application/json" },
			}),
		get: () => undefined,
		set: () => undefined,
	} as unknown as AppContext;
}

type EmailCodeUpdateArgs = {
	data?: {
		attempt_count?: { increment?: number };
		used_at?: string;
	};
	where?: {
		attempt_count?: { gte?: number };
	};
};

type StoredEmailCodeRow = Record<string, unknown> & {
	created_at: string;
};

async function readError(response: Response): Promise<Record<string, unknown>> {
	return (await response.json()) as Record<string, unknown>;
}

async function hmacCodeHash(code: string, salt = "test-code-salt"): Promise<string> {
	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode("test-otp-pepper"),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign(
		"HMAC",
		key,
		encoder.encode(`${salt}:${code}`),
	);
	return Array.from(new Uint8Array(signature))
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

async function makeRegistrationCodeRow(options?: {
	code?: string;
	attemptCount?: number;
}) {
	const code = options?.code ?? "123456";
	const salt = "test-code-salt";
	return {
		id: "email-code-1",
		code_salt: salt,
		code_hash: await hmacCodeHash(code, salt),
		attempt_count: options?.attemptCount ?? 0,
		expires_at: "2099-01-01T00:00:00.000Z",
	};
}

function existingEmailUser(overrides: Record<string, unknown> = {}) {
	return {
		id: "existing-user-1",
		login: "creator",
		name: "Creator",
		avatar_url: "https://example.com/avatar.png",
		email: "creator@example.com",
		phone: null,
		role: "admin",
		guest: 0,
		disabled: 0,
		deleted_at: null,
		password_hash: null,
		password_salt: null,
		...overrides,
	};
}

describe("email registration code request", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		Object.assign(config, {
			resendApiKey: "re_test",
			resendFrom: "TapCanvas <auth@example.com>",
			emailLoginDebug: false,
			authOtpPepper: "test-otp-pepper",
		});
		prisma.email_login_codes.findFirst.mockResolvedValue(null);
		prisma.email_login_codes.count.mockResolvedValue(0);
		prisma.email_login_codes.updateMany.mockResolvedValue({ count: 0 });
		prisma.email_login_codes.create.mockResolvedValue(undefined);
		prisma.$transaction.mockImplementation(
			async (callback: (client: typeof prisma) => Promise<unknown>) => callback(prisma),
		);
		vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 200 })));
	});

	it("returns a development code only when non-production debug is explicitly enabled", async () => {
		Object.assign(config, {
			resendApiKey: null,
			resendFrom: null,
			emailLoginDebug: true,
		});

		const result = await requestEmailRegistrationCode(
			createContext("development"),
			"  NEW-USER@Example.COM ",
		);

		expect(result).toMatchObject({
			sent: true,
			expiresInSeconds: 600,
			retryAfterSeconds: 60,
			delivery: "debug",
			devCode: expect.stringMatching(/^\d{6}$/),
		});
		expect(prisma.email_login_codes.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				email: "new-user@example.com",
				purpose: "register",
				attempt_count: 0,
				code_hash: expect.not.stringMatching(/^\d{6}$/),
			}),
		});
		expect(fetch).not.toHaveBeenCalled();
	});

	it("rejects production requests when pepper or Resend configuration is missing", async () => {
		Object.assign(config, {
			resendApiKey: null,
			resendFrom: null,
			emailLoginDebug: true,
			authOtpPepper: null,
		});

		const result = await requestEmailRegistrationCode(
			createContext("production"),
			"user@example.com",
		);

		expect(result).toBeInstanceOf(Response);
		expect((result as Response).status).toBe(501);
		expect(await readError(result as Response)).toMatchObject({
			success: false,
			code: "email_registration_not_configured",
			missing: {
				AUTH_OTP_PEPPER: true,
				RESEND_API_KEY: true,
				RESEND_FROM: true,
			},
		});
		expect(prisma.email_login_codes.create).not.toHaveBeenCalled();
	});

	it("never returns a development code in production even when debug is enabled", async () => {
		Object.assign(config, { emailLoginDebug: true });

		const result = await requestEmailRegistrationCode(
			createContext("production"),
			"user@example.com",
		);

		expect(result).toMatchObject({ delivery: "email" });
		expect(result).not.toHaveProperty("devCode");
		expect(fetch).toHaveBeenCalledTimes(1);
	});

	it("never returns a development code when NODE_ENV is missing", async () => {
		Object.assign(config, { emailLoginDebug: true });
		const previousNodeEnv = process.env.NODE_ENV;
		delete process.env.NODE_ENV;

		try {
			const result = await requestEmailRegistrationCode(
				createContext(null),
				"user@example.com",
			);

			expect(result).toMatchObject({ delivery: "email" });
			expect(result).not.toHaveProperty("devCode");
			expect(fetch).toHaveBeenCalledTimes(1);
		} finally {
			if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
			else process.env.NODE_ENV = previousNodeEnv;
		}
	});

	it("requires Resend configuration when NODE_ENV is missing", async () => {
		Object.assign(config, {
			resendApiKey: null,
			resendFrom: null,
			emailLoginDebug: true,
		});
		const previousNodeEnv = process.env.NODE_ENV;
		delete process.env.NODE_ENV;

		try {
			const result = await requestEmailRegistrationCode(
				createContext(null),
				"user@example.com",
			);

			expect(result).toBeInstanceOf(Response);
			expect((result as Response).status).toBe(501);
			expect(await readError(result as Response)).toMatchObject({
				code: "email_registration_not_configured",
				missing: {
					AUTH_OTP_PEPPER: false,
					RESEND_API_KEY: true,
					RESEND_FROM: true,
				},
			});
			expect(prisma.email_login_codes.create).not.toHaveBeenCalled();
		} finally {
			if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
			else process.env.NODE_ENV = previousNodeEnv;
		}
	});

	it("enforces a sixty second cooldown per normalized email", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-07-13T08:00:00.000Z"));
		prisma.email_login_codes.findFirst.mockResolvedValue({
			created_at: "2026-07-13T07:59:30.000Z",
		});

		const result = await requestEmailRegistrationCode(
			createContext("production"),
			"User@Example.com",
		);

		expect(result).toBeInstanceOf(Response);
		expect((result as Response).status).toBe(429);
		expect(await readError(result as Response)).toMatchObject({
			code: "email_registration_cooldown",
			details: { retryAfterSeconds: 30 },
		});
		expect(prisma.email_login_codes.create).not.toHaveBeenCalled();
		vi.useRealTimers();
	});

	it("limits each normalized email to ten requests per China calendar day", async () => {
		prisma.email_login_codes.count.mockResolvedValue(10);

		const result = await requestEmailRegistrationCode(
			createContext("production"),
			"USER@example.com",
		);

		expect(result).toBeInstanceOf(Response);
		expect((result as Response).status).toBe(429);
		expect(await readError(result as Response)).toMatchObject({
			code: "email_registration_daily_limit_exceeded",
			details: { limitPerDay: 10 },
		});
		expect(prisma.email_login_codes.count).toHaveBeenCalledWith({
			where: expect.objectContaining({
				email: "user@example.com",
				purpose: "register",
			}),
		});
	});

	it("invalidates older unused registration codes before storing a replacement", async () => {
		Object.assign(config, {
			resendApiKey: null,
			resendFrom: null,
			emailLoginDebug: true,
		});

		await requestEmailRegistrationCode(
			createContext("development"),
			"user@example.com",
		);

		expect(prisma.email_login_codes.updateMany).toHaveBeenCalledWith({
			where: {
				email: "user@example.com",
				purpose: "register",
				used_at: null,
			},
			data: expect.objectContaining({ used_at: expect.any(String) }),
		});
	});

	it("marks the stored code used when Resend delivery fails", async () => {
		vi.mocked(fetch).mockResolvedValueOnce(
			new Response("provider error", { status: 500, statusText: "Server Error" }),
		);

		const result = await requestEmailRegistrationCode(
			createContext("production"),
			"user@example.com",
		);

		expect(result).toBeInstanceOf(Response);
		expect((result as Response).status).toBe(502);
		expect(await readError(result as Response)).toMatchObject({
			code: "email_registration_delivery_failed",
		});
		const createdId = prisma.email_login_codes.create.mock.calls[0]?.[0]?.data?.id;
		expect(prisma.email_login_codes.updateMany).toHaveBeenCalledWith({
			where: { id: createdId, used_at: null },
			data: expect.objectContaining({ used_at: expect.any(String) }),
		});
	});

	it("marks the code used and returns 502 when Resend throws a network error", async () => {
		vi.mocked(fetch).mockRejectedValueOnce(new Error("network timeout"));

		const result = await requestEmailRegistrationCode(
			createContext("production"),
			"user@example.com",
		);

		expect(result).toBeInstanceOf(Response);
		expect((result as Response).status).toBe(502);
		expect(await readError(result as Response)).toMatchObject({
			code: "email_registration_delivery_failed",
		});
		const createdId = prisma.email_login_codes.create.mock.calls[0]?.[0]?.data?.id;
		expect(prisma.email_login_codes.updateMany).toHaveBeenCalledWith({
			where: { id: createdId, used_at: null },
			data: expect.objectContaining({ used_at: expect.any(String) }),
		});
	});

	it("serializes issuance so concurrent requests cannot bypass cooldown or the daily limit", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-07-13T08:00:00.000Z"));
		Object.assign(config, {
			resendApiKey: null,
			resendFrom: null,
			emailLoginDebug: true,
		});
		const rows: StoredEmailCodeRow[] = Array.from({ length: 9 }, (_, index) => ({
			id: `old-${index}`,
			email: "user@example.com",
			purpose: "register",
			created_at: `2026-07-13T06:0${index}:00.000Z`,
			used_at: "2026-07-13T06:10:00.000Z",
		}));
		let insideTransaction = false;
		let queue: Promise<unknown> = Promise.resolve();
		prisma.$transaction.mockImplementation(
			(callback: (client: typeof prisma) => Promise<unknown>) => {
				const run = queue.then(async () => {
					insideTransaction = true;
					try {
						return await callback(prisma);
					} finally {
						insideTransaction = false;
					}
				});
				queue = run.then(
					() => undefined,
					() => undefined,
				);
				return run;
			},
		);
		let outsideReads = 0;
		let releaseOutsideReads: (() => void) | null = null;
		const outsideReadGate = new Promise<void>((resolve) => {
			releaseOutsideReads = resolve;
		});
		prisma.email_login_codes.findFirst.mockImplementation(async () => {
			if (insideTransaction) {
				const latest = rows.at(-1);
				return latest ? { created_at: latest.created_at } : null;
			}
			outsideReads += 1;
			if (outsideReads === 2) releaseOutsideReads?.();
			await outsideReadGate;
			return null;
		});
		prisma.email_login_codes.count.mockImplementation(async () => rows.length);
		prisma.email_login_codes.create.mockImplementation(async ({ data }: { data: StoredEmailCodeRow }) => {
			rows.push({ ...data });
			return undefined;
		});

		const results = await Promise.all([
			requestEmailRegistrationCode(
				createContext("development"),
				"USER@example.com",
			),
			requestEmailRegistrationCode(
				createContext("development"),
				"user@example.com",
			),
		]);

		expect(prisma.email_login_codes.create).toHaveBeenCalledTimes(1);
		expect(results.filter((result) => result instanceof Response)).toHaveLength(1);
		expect(results.filter((result) => !(result instanceof Response))).toHaveLength(1);
		const rejected = results.find((result) => result instanceof Response) as Response;
		expect(rejected.status).toBe(429);
		vi.useRealTimers();
	});

	it("retries a serializable issuance transaction after Prisma P2034", async () => {
		Object.assign(config, {
			resendApiKey: null,
			resendFrom: null,
			emailLoginDebug: true,
		});
		let attempts = 0;
		prisma.$transaction.mockImplementation(
			async (callback: (client: typeof prisma) => Promise<unknown>) => {
				attempts += 1;
				if (attempts === 1) {
					throw Object.assign(new Error("write conflict"), { code: "P2034" });
				}
				return callback(prisma);
			},
		);

		const result = await requestEmailRegistrationCode(
			createContext("development"),
			"user@example.com",
		);

		expect(result).toMatchObject({ delivery: "debug" });
		expect(prisma.$transaction).toHaveBeenCalledTimes(2);
		expect(prisma.email_login_codes.create).toHaveBeenCalledTimes(1);
	});
});

describe("email registration verification", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		Object.assign(config, {
			resendApiKey: "re_test",
			resendFrom: "TapCanvas <auth@example.com>",
			emailLoginDebug: false,
			authOtpPepper: "test-otp-pepper",
		});
		prisma.email_login_codes.updateMany.mockResolvedValue({ count: 1 });
		prisma.$transaction.mockImplementation(
			async (callback: (client: typeof prisma) => Promise<unknown>) => callback(prisma),
		);
		prisma.users.findMany.mockResolvedValue([]);
		prisma.users.findUnique.mockResolvedValue({
			role: null,
			password_hash: "configured-password-hash",
		});
		prisma.users.create.mockResolvedValue(undefined);
		prisma.users.update.mockResolvedValue(undefined);
		signJwtHS256.mockResolvedValue("mock-token");
		grantSignupBonusToPersonalTeam.mockResolvedValue(undefined);
	});

	it("increments every wrong attempt and invalidates the fifth one", async () => {
		const row = await makeRegistrationCodeRow();
		let usedAt: string | null = null;
		prisma.email_login_codes.findFirst.mockImplementation(async () =>
			usedAt ? null : { ...row },
		);
		prisma.email_login_codes.updateMany.mockImplementation(async (args: EmailCodeUpdateArgs) => {
			if (args?.data?.attempt_count?.increment === 1) {
				row.attempt_count += 1;
			}
			if (
				typeof args?.data?.used_at === "string" &&
				(!args?.where?.attempt_count?.gte ||
					row.attempt_count >= args.where.attempt_count.gte)
			) {
				usedAt = args.data.used_at;
			}
			return { count: 1 };
		});

		const results: Response[] = [];
		for (let attempt = 0; attempt < 5; attempt += 1) {
			const result = await verifyEmailRegistration(
				createContext("production"),
				"creator@example.com",
				"654321",
				"password-123",
			);
			expect(result).toBeInstanceOf(Response);
			results.push(result as Response);
		}

		expect(results.map((result) => result.status)).toEqual([401, 401, 401, 401, 401]);
		expect(await readError(results[4]!)).toMatchObject({
			code: "email_registration_code_invalid",
		});
		expect(prisma.email_login_codes.updateMany).toHaveBeenCalledWith({
			where: expect.objectContaining({
				id: "email-code-1",
				used_at: null,
			}),
			data: expect.objectContaining({
				attempt_count: { increment: 1 },
				used_at: expect.any(String),
			}),
		});
		expect(row.attempt_count).toBe(5);
		expect(usedAt).toEqual(expect.any(String));
		expect(signJwtHS256).not.toHaveBeenCalled();
	});

	it("invalidates the code when concurrent wrong attempts cross the five-attempt limit", async () => {
		const row = await makeRegistrationCodeRow({ attemptCount: 3 });
		let usedAt: string | null = null;
		prisma.email_login_codes.findFirst.mockImplementation(async () => ({ ...row }));
		prisma.email_login_codes.updateMany.mockImplementation(async (args: EmailCodeUpdateArgs) => {
			if (args?.data?.attempt_count?.increment === 1) {
				if (usedAt || row.attempt_count >= 5) return { count: 0 };
				row.attempt_count += 1;
				return { count: 1 };
			}
			if (
				typeof args?.data?.used_at === "string" &&
				args?.where?.attempt_count?.gte === 5 &&
				row.attempt_count >= 5 &&
				!usedAt
			) {
				usedAt = args.data.used_at;
				return { count: 1 };
			}
			return { count: 0 };
		});

		const results = await Promise.all([
			verifyEmailRegistration(
				createContext("production"),
				"creator@example.com",
				"654321",
				"password-123",
			),
			verifyEmailRegistration(
				createContext("production"),
				"creator@example.com",
				"654321",
				"password-123",
			),
		]);

		expect(results.every((result) => result instanceof Response)).toBe(true);
		expect(row.attempt_count).toBe(5);
		expect(usedAt).toEqual(expect.any(String));
		expect(signJwtHS256).not.toHaveBeenCalled();
	});

	it("rejects expired or missing codes before touching an account", async () => {
		prisma.email_login_codes.findFirst.mockResolvedValue(null);

		const result = await verifyEmailRegistration(
			createContext("production"),
			"creator@example.com",
			"123456",
			"password-123",
		);

		expect(result).toBeInstanceOf(Response);
		expect((result as Response).status).toBe(401);
		expect(prisma.users.findMany).not.toHaveBeenCalled();
		expect(prisma.email_login_codes.updateMany).not.toHaveBeenCalled();
	});

	it("never accepts a code whose attempt budget is already exhausted", async () => {
		prisma.email_login_codes.findFirst.mockResolvedValue(
			await makeRegistrationCodeRow({ attemptCount: 5 }),
		);

		const result = await verifyEmailRegistration(
			createContext("production"),
			"creator@example.com",
			"123456",
			"password-123",
		);

		expect(result).toBeInstanceOf(Response);
		expect((result as Response).status).toBe(401);
		expect(prisma.users.findMany).not.toHaveBeenCalled();
		expect(signJwtHS256).not.toHaveBeenCalled();
	});

	it("allows only one concurrent verification to consume the same code", async () => {
		const row = await makeRegistrationCodeRow();
		prisma.email_login_codes.findFirst.mockResolvedValue(row);
		let consumed = false;
		prisma.email_login_codes.updateMany.mockImplementation(async (args: EmailCodeUpdateArgs) => {
			if (!args?.data?.used_at || args?.data?.attempt_count) return { count: 0 };
			if (consumed) return { count: 0 };
			consumed = true;
			return { count: 1 };
		});

		const results = await Promise.all([
			verifyEmailRegistration(
				createContext("production"),
				"creator@example.com",
				"123456",
				"password-123",
			),
			verifyEmailRegistration(
				createContext("production"),
				"creator@example.com",
				"123456",
				"password-123",
			),
		]);

		expect(results.filter((result) => !(result instanceof Response))).toHaveLength(1);
		expect(results.filter((result) => result instanceof Response)).toHaveLength(1);
		expect(prisma.users.create).toHaveBeenCalledTimes(1);
		expect(signJwtHS256).toHaveBeenCalledTimes(1);
	});

	it("creates a deterministic email account with a PBKDF2 password", async () => {
		prisma.email_login_codes.findFirst.mockResolvedValue(
			await makeRegistrationCodeRow(),
		);

		const result = await verifyEmailRegistration(
			createContext("production"),
			"Creator@Example.COM",
			"123456",
			"password-123",
		);

		expect(result).toMatchObject({
			token: "mock-token",
			user: expect.objectContaining({
				sub: expect.stringMatching(/^email_[a-f0-9]{64}$/),
				email: "creator@example.com",
				hasPassword: true,
			}),
		});
		expect(prisma.users.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				id: expect.stringMatching(/^email_[a-f0-9]{64}$/),
				email: "creator@example.com",
				password_hash: expect.any(String),
				password_salt: expect.any(String),
				password_updated_at: expect.any(String),
			}),
		});
		expect(grantSignupBonusToPersonalTeam).toHaveBeenCalledTimes(1);
	});

	it("keeps registration authenticated when bonus reconciliation fails and retries it on password login", async () => {
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
		prisma.email_login_codes.findFirst.mockResolvedValue(
			await makeRegistrationCodeRow(),
		);
		grantSignupBonusToPersonalTeam
			.mockRejectedValueOnce(new Error("bonus storage unavailable"))
			.mockResolvedValueOnce(undefined);

		try {
			const registration = await verifyEmailRegistration(
				createContext("production"),
				"creator@example.com",
				"123456",
				"password-123",
			);

			expect(registration).toMatchObject({ token: "mock-token" });
			expect(signJwtHS256).toHaveBeenCalledTimes(1);
			expect(consoleError).toHaveBeenCalledWith(
				"[auth/email] signup bonus reconciliation failed",
				expect.objectContaining({
					userId: expect.stringMatching(/^email_[a-f0-9]{64}$/),
					error: expect.any(Error),
				}),
			);

			if (registration instanceof Response) {
				throw new Error("registration unexpectedly failed");
			}
			const password = await createPasswordRecord("password-123");
			const account = existingEmailUser({
				id: registration.user.sub,
				password_hash: password.hash,
				password_salt: password.salt,
			});
			prisma.users.findMany.mockResolvedValue([account]);
			prisma.users.updateMany.mockResolvedValue({ count: 1 });
			prisma.users.findUnique.mockResolvedValue(account);

			const login = await loginWithEmailPassword(
				createContext("production"),
				"creator@example.com",
				"password-123",
			);

			expect(login).toMatchObject({ token: "mock-token" });
			expect(grantSignupBonusToPersonalTeam).toHaveBeenCalledTimes(2);
			expect(grantSignupBonusToPersonalTeam).toHaveBeenLastCalledWith(
				expect.anything(),
				registration.user.sub,
			);
		} finally {
			consoleError.mockRestore();
		}
	});

	it("resolves, consumes, and writes the account in one transaction before signing", async () => {
		const events: string[] = [];
		prisma.email_login_codes.findFirst.mockResolvedValue(
			await makeRegistrationCodeRow(),
		);
		prisma.$transaction.mockImplementation(
			async (callback: (client: typeof prisma) => Promise<unknown>) => {
				events.push("transaction:start");
				const result = await callback(prisma);
				events.push("transaction:commit");
				return result;
			},
		);
		prisma.users.findMany.mockImplementation(async () => {
			events.push("account:resolve");
			return [];
		});
		prisma.email_login_codes.updateMany.mockImplementation(async (args: EmailCodeUpdateArgs) => {
			if (args?.data?.used_at && !args?.data?.attempt_count) {
				events.push("code:consume");
			}
			return { count: 1 };
		});
		prisma.users.create.mockImplementation(async () => {
			events.push("account:create");
			return undefined;
		});
		signJwtHS256.mockImplementation(async () => {
			events.push("token:sign");
			return "mock-token";
		});

		const result = await verifyEmailRegistration(
			createContext("production"),
			"creator@example.com",
			"123456",
			"password-123",
		);

		expect(result).toMatchObject({ token: "mock-token" });
		expect(events).toEqual([
			"transaction:start",
			"account:resolve",
			"code:consume",
			"account:create",
			"transaction:commit",
			"token:sign",
		]);
	});

	it("claims one existing email account without changing its identity or role", async () => {
		prisma.email_login_codes.findFirst.mockResolvedValue(
			await makeRegistrationCodeRow(),
		);
		prisma.users.findMany.mockResolvedValue([existingEmailUser()]);
		prisma.users.findUnique.mockResolvedValue({
			role: "admin",
			password_hash: "configured-password-hash",
		});

		const result = await verifyEmailRegistration(
			createContext("production"),
			"CREATOR@example.com",
			"123456",
			"new-password-123",
		);

		expect(prisma.users.create).not.toHaveBeenCalled();
		expect(prisma.users.update).toHaveBeenCalledWith({
			where: { id: "existing-user-1" },
			data: expect.objectContaining({
				email: "creator@example.com",
				password_hash: expect.any(String),
			}),
		});
		expect(result).toMatchObject({
			user: expect.objectContaining({ sub: "existing-user-1", role: "admin" }),
		});
		expect(grantSignupBonusToPersonalTeam).toHaveBeenCalledWith(
			expect.anything(),
			"existing-user-1",
		);
	});

	it("refuses ambiguous duplicate email accounts", async () => {
		prisma.email_login_codes.findFirst.mockResolvedValue(
			await makeRegistrationCodeRow(),
		);
		prisma.users.findMany.mockResolvedValue([
			existingEmailUser({ id: "duplicate-1" }),
			existingEmailUser({ id: "duplicate-2" }),
		]);

		const result = await verifyEmailRegistration(
			createContext("production"),
			"creator@example.com",
			"123456",
			"password-123",
		);

		expect(result).toBeInstanceOf(Response);
		expect((result as Response).status).toBe(409);
		expect(await readError(result as Response)).toMatchObject({
			code: "email_account_conflict",
		});
		expect(signJwtHS256).not.toHaveBeenCalled();
	});

	it.each([
		["disabled", { disabled: 1 }, "user_disabled"],
		["deleted", { deleted_at: "2026-07-13T00:00:00.000Z" }, "user_deleted"],
	])("rejects a %s email account", async (_label, overrides, expectedCode) => {
		prisma.email_login_codes.findFirst.mockResolvedValue(
			await makeRegistrationCodeRow(),
		);
		prisma.users.findMany.mockResolvedValue([existingEmailUser(overrides)]);

		const result = await verifyEmailRegistration(
			createContext("production"),
			"creator@example.com",
			"123456",
			"password-123",
		);

		expect(result).toBeInstanceOf(Response);
		expect((result as Response).status).toBe(403);
		expect(await readError(result as Response)).toMatchObject({ code: expectedCode });
		expect(signJwtHS256).not.toHaveBeenCalled();
	});
});

describe("email password login", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		Object.assign(config, { authOtpPepper: "test-otp-pepper" });
		prisma.$transaction.mockImplementation(
			async (callback: (client: typeof prisma) => Promise<unknown>) => callback(prisma),
		);
		prisma.users.updateMany.mockResolvedValue({ count: 1 });
		prisma.users.update.mockResolvedValue(undefined);
		signJwtHS256.mockResolvedValue("mock-token");
		grantSignupBonusToPersonalTeam.mockResolvedValue(undefined);
	});

	it("logs in a unique email account with the correct password", async () => {
		const password = await createPasswordRecord("password-123");
		const account = existingEmailUser({
				role: "member",
				password_hash: password.hash,
				password_salt: password.salt,
			});
		prisma.users.findMany.mockResolvedValue([account]);
		prisma.users.findUnique.mockResolvedValue(account);

		const result = await loginWithEmailPassword(
			createContext("production"),
			" CREATOR@Example.com ",
			"password-123",
		);

		expect(result).toMatchObject({
			token: "mock-token",
			user: expect.objectContaining({
				sub: "existing-user-1",
				email: "creator@example.com",
				hasPassword: true,
			}),
		});
		expect(prisma.users.updateMany).toHaveBeenCalledWith({
			where: {
				id: "existing-user-1",
				disabled: 0,
				deleted_at: null,
				password_hash: password.hash,
				password_salt: password.salt,
			},
			data: expect.objectContaining({ last_seen_at: expect.any(String) }),
		});
		expect(prisma.$transaction).toHaveBeenCalledWith(
			expect.any(Function),
			{ isolationLevel: "Serializable" },
		);
		expect(grantSignupBonusToPersonalTeam).toHaveBeenCalledWith(
			expect.anything(),
			"existing-user-1",
		);
	});

	it.each([
		{
			label: "disabled",
			mutation: { disabled: 1 },
			expectedStatus: 403,
			expectedCode: "user_disabled",
		},
		{
			label: "deleted",
			mutation: { deleted_at: "2026-07-13T00:00:00.000Z" },
			expectedStatus: 403,
			expectedCode: "user_deleted",
		},
		{
			label: "password changed",
			mutation: { password_hash: "changed-hash", password_salt: "changed-salt" },
			expectedStatus: 401,
			expectedCode: null,
		},
	])(
		"does not issue a token when the account is $label after password verification",
		async ({ mutation, expectedStatus, expectedCode }) => {
			const password = await createPasswordRecord("password-123");
			const verifiedAccount = existingEmailUser({
				password_hash: password.hash,
				password_salt: password.salt,
			});
			prisma.users.findMany.mockResolvedValue([verifiedAccount]);
			prisma.users.updateMany.mockResolvedValue({ count: 0 });
			prisma.users.findUnique.mockResolvedValue(
				existingEmailUser({
					password_hash: password.hash,
					password_salt: password.salt,
					...mutation,
				}),
			);

			const result = await loginWithEmailPassword(
				createContext("production"),
				"creator@example.com",
				"password-123",
			);

			expect(result).toBeInstanceOf(Response);
			expect((result as Response).status).toBe(expectedStatus);
			if (expectedCode) {
				expect(await readError(result as Response)).toMatchObject({
					code: expectedCode,
				});
			}
			expect(signJwtHS256).not.toHaveBeenCalled();
			expect(grantSignupBonusToPersonalTeam).not.toHaveBeenCalled();
		},
	);

	it("uses the same public error for an unknown email and a wrong password", async () => {
		prisma.users.findMany.mockResolvedValueOnce([]);
		const unknown = await loginWithEmailPassword(
			createContext("production"),
			"missing@example.com",
			"password-123",
		);

		const password = await createPasswordRecord("correct-password");
		prisma.users.findMany.mockResolvedValueOnce([
			existingEmailUser({
				password_hash: password.hash,
				password_salt: password.salt,
			}),
		]);
		const wrong = await loginWithEmailPassword(
			createContext("production"),
			"creator@example.com",
			"wrong-password",
		);

		expect(unknown).toBeInstanceOf(Response);
		expect(wrong).toBeInstanceOf(Response);
		expect((unknown as Response).status).toBe(401);
		expect((wrong as Response).status).toBe(401);
		expect(await readError(unknown as Response)).toMatchObject({
			error: "邮箱或密码不正确",
		});
		expect(await readError(wrong as Response)).toMatchObject({
			error: "邮箱或密码不正确",
		});
	});

	it("runs a dummy PBKDF2 check and returns the same generic error for unknown and passwordless accounts", async () => {
		const deriveBits = vi.spyOn(crypto.subtle, "deriveBits");
		prisma.users.findMany.mockResolvedValueOnce([]);
		const unknown = await loginWithEmailPassword(
			createContext("production"),
			"missing@example.com",
			"password-123",
		);
		prisma.users.findMany.mockResolvedValueOnce([existingEmailUser()]);
		const passwordless = await loginWithEmailPassword(
			createContext("production"),
			"creator@example.com",
			"password-123",
		);

		expect(unknown).toBeInstanceOf(Response);
		expect(passwordless).toBeInstanceOf(Response);
		expect(await readError(unknown as Response)).toEqual({
			success: false,
			error: "邮箱或密码不正确",
		});
		expect(await readError(passwordless as Response)).toEqual({
			success: false,
			error: "邮箱或密码不正确",
		});
		expect(deriveBits).toHaveBeenCalledTimes(2);
		deriveBits.mockRestore();
	});

	it("refuses ambiguous duplicate email accounts", async () => {
		prisma.users.findMany.mockResolvedValue([
			existingEmailUser({ id: "duplicate-1" }),
			existingEmailUser({ id: "duplicate-2" }),
		]);

		const result = await loginWithEmailPassword(
			createContext("production"),
			"creator@example.com",
			"password-123",
		);

		expect(result).toBeInstanceOf(Response);
		expect((result as Response).status).toBe(409);
		expect(await readError(result as Response)).toMatchObject({
			code: "email_account_conflict",
		});
	});

	it.each([
		["disabled", { disabled: 1 }, "user_disabled"],
		["deleted", { deleted_at: "2026-07-13T00:00:00.000Z" }, "user_deleted"],
	])("rejects a %s account", async (_label, overrides, expectedCode) => {
		const password = await createPasswordRecord("password-123");
		prisma.users.findMany.mockResolvedValue([
			existingEmailUser({
				...overrides,
				password_hash: password.hash,
				password_salt: password.salt,
			}),
		]);

		const result = await loginWithEmailPassword(
			createContext("production"),
			"creator@example.com",
			"password-123",
		);

		expect(result).toBeInstanceOf(Response);
		expect((result as Response).status).toBe(403);
		expect(await readError(result as Response)).toMatchObject({ code: expectedCode });
	});

	it.each([
		["disabled", { disabled: 1 }],
		["deleted", { deleted_at: "2026-07-13T00:00:00.000Z" }],
	])("returns generic credentials for a %s account when the password is wrong", async (_label, overrides) => {
		const password = await createPasswordRecord("correct-password");
		prisma.users.findMany.mockResolvedValue([
			existingEmailUser({
				...overrides,
				password_hash: password.hash,
				password_salt: password.salt,
			}),
		]);

		const result = await loginWithEmailPassword(
			createContext("production"),
			"creator@example.com",
			"wrong-password",
		);

		expect(result).toBeInstanceOf(Response);
		expect((result as Response).status).toBe(401);
		expect(await readError(result as Response)).toEqual({
			success: false,
			error: "邮箱或密码不正确",
		});
	});
});
