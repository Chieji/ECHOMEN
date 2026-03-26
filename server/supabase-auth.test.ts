import { describe, expect, it } from "vitest";

describe("Supabase credentials validation", () => {
  it("should have SUPABASE_URL set and valid", () => {
    const url = process.env.SUPABASE_URL;
    expect(url).toBeDefined();
    expect(url).not.toBe("");
    expect(url).toMatch(/^https:\/\/.+\.supabase\./);
  });

  it("should have SUPABASE_KEY set and non-empty", () => {
    const key = process.env.SUPABASE_KEY;
    expect(key).toBeDefined();
    expect(key).not.toBe("");
    expect(key!.length).toBeGreaterThan(10);
  });

  it("should have SUPABASE_ANON_KEY set and valid JWT", () => {
    const anonKey = process.env.SUPABASE_ANON_KEY;
    expect(anonKey).toBeDefined();
    expect(anonKey).not.toBe("");
    // Supabase anon keys are JWT tokens starting with "eyJ"
    expect(anonKey!.startsWith("eyJ")).toBe(true);
  });

  it("should be able to reach Supabase auth endpoint with anon key", async () => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;

    // Strip trailing slash if present
    const baseUrl = url!.replace(/\/$/, "");

    const response = await fetch(`${baseUrl}/auth/v1/settings`, {
      headers: {
        apikey: key!,
        Authorization: `Bearer ${key}`,
      },
    });
    // 200 means the project is reachable and the key is valid for auth
    expect(response.status).toBe(200);
  });
});
