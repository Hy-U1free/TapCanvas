import { describe, expect, it } from "vitest";
import {
	EmailLoginRequestSchema,
	EmailPasswordLoginRequestSchema,
	EmailRegisterRequestSchema,
	EmailRegisterVerifyRequestSchema,
	EmailVerifyRequestSchema,
} from "./auth.schemas";

describe("email authentication request schemas", () => {
	it("normalizes registration emails", () => {
		expect(
			EmailRegisterRequestSchema.parse({ email: "  Creator@Example.COM  " }),
		).toEqual({ email: "creator@example.com" });
		expect(EmailRegisterRequestSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
	});

	it("accepts only a six-digit registration code", () => {
		const parsed = EmailRegisterVerifyRequestSchema.parse({
			email: "  Creator@Example.COM  ",
			code: " 123456 ",
			password: "password-123",
		});

		expect(parsed).toEqual({
			email: "creator@example.com",
			code: "123456",
			password: "password-123",
		});
		for (const code of ["12345", "1234567", "abcdef"]) {
			expect(
				EmailRegisterVerifyRequestSchema.safeParse({
					email: "creator@example.com",
					code,
					password: "password-123",
				}).success,
			).toBe(false);
		}
	});

	it("enforces registration password length from 8 through 128 characters", () => {
		const base = { email: "creator@example.com", code: "123456" };

		expect(
			EmailRegisterVerifyRequestSchema.safeParse({ ...base, password: "12345678" }).success,
		).toBe(true);
		expect(
			EmailRegisterVerifyRequestSchema.safeParse({ ...base, password: "x".repeat(128) }).success,
		).toBe(true);
		expect(
			EmailRegisterVerifyRequestSchema.safeParse({ ...base, password: "1234567" }).success,
		).toBe(false);
		expect(
			EmailRegisterVerifyRequestSchema.safeParse({ ...base, password: "x".repeat(129) }).success,
		).toBe(false);
	});

	it("normalizes password-login emails and enforces password length", () => {
		expect(
			EmailPasswordLoginRequestSchema.parse({
				email: "  Creator@Example.COM  ",
				password: "password-123",
			}),
		).toEqual({ email: "creator@example.com", password: "password-123" });
		expect(
			EmailPasswordLoginRequestSchema.safeParse({
				email: "creator@example.com",
				password: "1234567",
			}).success,
		).toBe(false);
		expect(
			EmailPasswordLoginRequestSchema.safeParse({
				email: "creator@example.com",
				password: "x".repeat(129),
			}).success,
		).toBe(false);
	});

	it("keeps the legacy passwordless email schemas available", () => {
		expect(EmailLoginRequestSchema.parse({ email: " Legacy@Example.COM " })).toEqual({
			email: "legacy@example.com",
		});
		expect(
			EmailVerifyRequestSchema.parse({
				email: " Legacy@Example.COM ",
				code: "123456",
			}),
		).toEqual({ email: "legacy@example.com", code: "123456" });
	});
});
