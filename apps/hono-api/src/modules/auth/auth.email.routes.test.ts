import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkerEnv } from "../../types";

const {
	exchangeGithubCode,
	loginWithEmailPassword,
	loginWithPhonePassword,
	requestEmailRegistrationCode,
	requestPhoneLoginCode,
	setPasswordForAuthenticatedUser,
	verifyEmailRegistration,
	verifyPhoneLoginCode,
} = vi.hoisted(() => ({
	exchangeGithubCode: vi.fn(),
	loginWithEmailPassword: vi.fn(),
	loginWithPhonePassword: vi.fn(),
	requestEmailRegistrationCode: vi.fn(),
	requestPhoneLoginCode: vi.fn(),
	setPasswordForAuthenticatedUser: vi.fn(),
	verifyEmailRegistration: vi.fn(),
	verifyPhoneLoginCode: vi.fn(),
}));

vi.mock("./auth.service", () => ({
	exchangeGithubCode,
	loginWithEmailPassword,
	loginWithPhonePassword,
	requestEmailRegistrationCode,
	requestPhoneLoginCode,
	setPasswordForAuthenticatedUser,
	verifyEmailRegistration,
	verifyPhoneLoginCode,
}));

vi.mock("../../middleware/auth", () => ({
	authMiddleware: vi.fn(async (_c, next) => next()),
	resolveAuth: vi.fn(async () => null),
}));

import { authRouter } from "./auth.routes";

const AUTH_RESULT = {
	token: "email-auth-token",
	user: {
		sub: "email_user_1",
		login: "creator",
		name: "Creator",
		avatarUrl: null,
		email: "creator@example.com",
		phone: null,
		hasPassword: true,
		role: "member",
		guest: false,
	},
};

async function post(path: string, body: Record<string, unknown>): Promise<Response> {
	return authRouter.request(
		`http://localhost${path}`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		},
		{ JWT_SECRET: "test-secret" } as unknown as WorkerEnv,
	);
}

describe("email registration and password auth routes", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		requestEmailRegistrationCode.mockResolvedValue({
			sent: true,
			expiresInSeconds: 600,
			retryAfterSeconds: 60,
			delivery: "email",
		});
		verifyEmailRegistration.mockResolvedValue(AUTH_RESULT);
		loginWithEmailPassword.mockResolvedValue(AUTH_RESULT);
	});

	it("requests a registration code with a normalized email", async () => {
		const response = await post("/email/register/request", {
			email: "  Creator@Example.COM  ",
		});

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			success: true,
			sent: true,
			expiresInSeconds: 600,
			retryAfterSeconds: 60,
			delivery: "email",
		});
		expect(requestEmailRegistrationCode).toHaveBeenCalledWith(
			expect.anything(),
			"creator@example.com",
		);
	});

	it("verifies registration, validates the auth response, and attaches the auth cookie", async () => {
		const response = await post("/email/register/verify", {
			email: "  Creator@Example.COM  ",
			code: " 123456 ",
			password: "password-123",
		});

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual(AUTH_RESULT);
		expect(response.headers.get("set-cookie")).toContain(
			"tap_token=email-auth-token",
		);
		expect(verifyEmailRegistration).toHaveBeenCalledWith(
			expect.anything(),
			"creator@example.com",
			"123456",
			"password-123",
		);
	});

	it("logs in with email and password and attaches the auth cookie", async () => {
		const response = await post("/email/password-login", {
			email: "  Creator@Example.COM  ",
			password: "password-123",
		});

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual(AUTH_RESULT);
		expect(response.headers.get("set-cookie")).toContain(
			"tap_token=email-auth-token",
		);
		expect(loginWithEmailPassword).toHaveBeenCalledWith(
			expect.anything(),
			"creator@example.com",
			"password-123",
		);
	});

	it("rejects malformed registration input before calling the service", async () => {
		const response = await post("/email/register/verify", {
			email: "not-an-email",
			code: "12345",
			password: "short",
		});

		expect(response.status).toBe(400);
		expect(verifyEmailRegistration).not.toHaveBeenCalled();
	});

	it("keeps the legacy email OTP endpoints disabled", async () => {
		const requestResponse = await post("/email/request", {
			email: "creator@example.com",
		});
		const verifyResponse = await post("/email/verify", {
			email: "creator@example.com",
			code: "123456",
		});

		expect(requestResponse.status).toBe(410);
		expect(verifyResponse.status).toBe(410);
		expect(await requestResponse.json()).toMatchObject({
			code: "email_login_disabled",
			error: expect.stringContaining("邮箱密码登录"),
		});
		expect(await verifyResponse.json()).toMatchObject({
			code: "email_login_disabled",
			error: expect.stringContaining("邮箱密码登录"),
		});
	});
});
