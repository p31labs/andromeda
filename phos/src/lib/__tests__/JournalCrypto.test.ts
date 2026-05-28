import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock crypto.subtle for tests
const mockKey = { type: "secret", algorithm: { name: "AES-GCM" } };
const testPlaintext = "This is a test journal entry about my day.";

beforeEach(() => {
  // Ensure localStorage is clean
  localStorage.clear();

  // Mock crypto.subtle if not available (jsdom)
  if (typeof crypto === "undefined" || !crypto.subtle) {
    (globalThis as any).crypto = {
      getRandomValues: (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
        return arr;
      },
      subtle: {
        importKey: vi.fn().mockResolvedValue(mockKey),
        deriveKey: vi.fn().mockResolvedValue(mockKey),
        encrypt: vi.fn().mockImplementation(async (_algo, _key, data) => {
          // Return a predictable ciphertext for testing
          return (data as ArrayBuffer).slice(0);
        }),
        decrypt: vi.fn().mockImplementation(async (_algo, _key, data) => {
          // Return the ciphertext as plaintext (mock)
          return (data as ArrayBuffer).slice(0);
        }),
      },
      randomUUID: () => Math.random().toString(36).slice(2),
    };
  }
});

describe("JournalCrypto", () => {
  describe("encryptEntry / decryptEntry roundtrip", () => {
    it("encrypts and decrypts a plaintext string", async () => {
      const { encryptEntry, decryptEntry } = await import("../JournalCrypto");

      const encrypted = await encryptEntry(testPlaintext);
      expect(encrypted).toContain(":");
      expect(encrypted).not.toBe(testPlaintext);

      const decrypted = await decryptEntry(encrypted);
      expect(decrypted).toBe(testPlaintext);
    });

    it("produces different ciphertext for same plaintext (random IV)", async () => {
      const { encryptEntry } = await import("../JournalCrypto");

      const enc1 = await encryptEntry(testPlaintext);
      const enc2 = await encryptEntry(testPlaintext);
      expect(enc1).not.toBe(enc2);
    });

    it("handles empty string", async () => {
      const { encryptEntry, decryptEntry } = await import("../JournalCrypto");

      const encrypted = await encryptEntry("");
      const decrypted = await decryptEntry(encrypted);
      expect(decrypted).toBe("");
    });

    it("handles unicode text", async () => {
      const { encryptEntry, decryptEntry } = await import("../JournalCrypto");

      const unicode = "\u2693 \ud83c\udf0a \ud83d\udd34 \ud83c\udf31 PHOS\u00ae \u24c2";
      const encrypted = await encryptEntry(unicode);
      const decrypted = await decryptEntry(encrypted);
      expect(decrypted).toBe(unicode);
    });

    it("throws on tampered ciphertext", async () => {
      const { encryptEntry, decryptEntry } = await import("../JournalCrypto");

      const encrypted = await encryptEntry(testPlaintext);
      // Tamper with the ciphertext
      const tampered = encrypted.slice(0, -5) + "XXXXX";

      await expect(decryptEntry(tampered)).rejects.toThrow();
    });

    it("throws on invalid format", async () => {
      const { decryptEntry } = await import("../JournalCrypto");

      await expect(decryptEntry("no-colon-here")).rejects.toThrow();
    });
  });

  describe("encryptAndPackageEntries / decryptAndUnpackageEntries", () => {
    it("encrypts and decrypts multiple entries", async () => {
      const { encryptAndPackageEntries, decryptAndUnpackageEntries } = await import("../JournalCrypto");

      const entries = [
        { id: "e1", text: "Entry one" },
        { id: "e2", text: "Entry two" },
      ];

      const packaged = await encryptAndPackageEntries(entries);
      const decrypted = await decryptAndUnpackageEntries(packaged);

      expect(decrypted).toHaveLength(2);
      expect(decrypted[0].id).toBe("e1");
      expect(decrypted[0].text).toBe("Entry one");
      expect(decrypted[1].text).toBe("Entry two");
    });

    it("handles empty array", async () => {
      const { encryptAndPackageEntries, decryptAndUnpackageEntries } = await import("../JournalCrypto");

      const packaged = await encryptAndPackageEntries([]);
      const decrypted = await decryptAndUnpackageEntries(packaged);
      expect(decrypted).toHaveLength(0);
    });
  });

  describe("getKeyFingerprint", () => {
    it("returns a fingerprint string", async () => {
      const { getKeyFingerprint } = await import("../JournalCrypto");

      const fp = getKeyFingerprint();
      expect(typeof fp).toBe("string");
      expect(fp.length).toBeGreaterThan(0);
    });
  });

  describe("isCryptoReady", () => {
    it("returns a boolean", async () => {
      const { isCryptoReady } = await import("../JournalCrypto");

      const ready = await isCryptoReady();
      expect(typeof ready).toBe("boolean");
    });
  });
});
