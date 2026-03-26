import { describe, expect, it } from "vitest";

describe("Supabase Auth Credentials", () => {
  it("should have valid SUPABASE_URL environment variable", () => {
    const url = process.env.VITE_SUPABASE_URL;
    expect(url).toBeDefined();
    expect(url).toMatch(/^https:\/\/.*\.supabase\.co$/);
  });

  it("should have valid SUPABASE_ANON_KEY environment variable", () => {
    const key = process.env.VITE_SUPABASE_ANON_KEY;
    expect(key).toBeDefined();
    // Publishable keys start with sb_publishable_
    expect(key).toMatch(/^sb_publishable_/);
  });

  it("should be able to construct Supabase client URL", () => {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_ANON_KEY;
    
    expect(url).toBeDefined();
    expect(key).toBeDefined();
    
    // Verify URL format
    const supabaseUrl = new URL(url!);
    expect(supabaseUrl.protocol).toBe("https:");
    expect(supabaseUrl.hostname).toContain("supabase.co");
  });

  it("should be able to reach Supabase auth endpoint", async () => {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      throw new Error("Supabase credentials not set");
    }

    try {
      const response = await fetch(`${url}/auth/v1/settings`, {
        headers: {
          "apikey": key,
          "Authorization": `Bearer ${key}`,
        },
      });
      
      // Should get 200 OK or 401 (auth required) - both mean the endpoint exists
      expect([200, 401]).toContain(response.status);
    } catch (error) {
      throw new Error(`Failed to reach Supabase auth endpoint: ${error}`);
    }
  });
});
