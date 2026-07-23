import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function readApiFile(relativePath: string): string {
	return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("email authentication storage and environment contracts", () => {
	it("adds registration purpose and attempt tracking to bootstrap SQL", () => {
		const sql = readApiFile("schema.sql");

		expect(sql).toMatch(/purpose\s+TEXT\s+NOT NULL\s+DEFAULT\s+'register'/i);
		expect(sql).toMatch(/attempt_count\s+INTEGER\s+NOT NULL\s+DEFAULT\s+0/i);
		expect(sql).toMatch(
			/ALTER TABLE email_login_codes ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'register';/i,
		);
		expect(sql).toMatch(
			/ALTER TABLE email_login_codes ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0;/i,
		);
	});

	it("exposes matching defaults through the Prisma model", () => {
		const prismaSchema = readApiFile("prisma/schema.prisma");
		const model = prismaSchema.match(/model email_login_codes \{([\s\S]*?)\n\}/)?.[1] ?? "";

		expect(model).toMatch(/purpose\s+String\s+@default\("register"\)/);
		expect(model).toMatch(/attempt_count\s+Int\s+@default\(0\)/);
	});

	it("documents and forwards every email-auth environment variable", () => {
		const nodeEnv = readApiFile("src/platform/node/node-env.ts");
		const envExample = readApiFile(".env.example");

		expect(nodeEnv).toContain("AUTH_OTP_PEPPER: process.env.AUTH_OTP_PEPPER");
		expect(envExample).toMatch(/^NODE_ENV=development$/m);
		expect(envExample).toMatch(/^RESEND_API_KEY=$/m);
		expect(envExample).toMatch(/^RESEND_FROM=$/m);
		expect(envExample).toMatch(/^AUTH_OTP_PEPPER=$/m);
		expect(envExample).toMatch(/^# EMAIL_LOGIN_DEBUG=1$/m);
	});
});
