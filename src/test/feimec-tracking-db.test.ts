import { describe, expect, it } from "vitest";

import { resolveDatabaseUrl } from "@/lib/feimec-tracking-db";

describe("resolveDatabaseUrl", () => {
  it("builds DATABASE_URL from Supabase DB variables when DATABASE_URL is absent", () => {
    const databaseUrl = resolveDatabaseUrl({
      SUPABASE_DB_HOST: "aws-1-us-east-1.pooler.supabase.com",
      SUPABASE_DB_PORT: "5432",
      SUPABASE_DB_NAME: "postgres",
      SUPABASE_DB_USER: "postgres.project-ref",
      SUPABASE_DB_PASSWORD: "V:EOr248u~|4",
    });

    expect(databaseUrl).toBe(
      "postgresql://postgres.project-ref:V%3AEOr248u~%7C4@aws-1-us-east-1.pooler.supabase.com:5432/postgres",
    );
  });

  it("throws when neither DATABASE_URL nor complete Supabase DB variables are configured", () => {
    expect(() => resolveDatabaseUrl({})).toThrow("DATABASE_URL is not configured.");
  });
});