import { beforeEach, describe, expect, it } from "vitest";
import {
  decryptSubmissionSecrets,
  encryptSubmissionSecrets,
  MASKED_SECRET,
  maskSubmissionSecrets,
  maskSubmissionSecretsDeep,
  dropMaskedSecretFields,
} from "./submission-secrets";

const KEY = Buffer.alloc(32, 7).toString("base64");
const OTHER_KEY = Buffer.alloc(32, 8).toString("base64");

describe("submission secret encryption", () => {
  beforeEach(() => {
    delete process.env.SUBMISSION_ENCRYPTION_KEY;
  });

  it("round trips listed secrets and recursively protects autoSaveData", () => {
    const source = {
      GmailPW: "gmail-secret",
      해외결제카드CVC: "123",
      일반값: "kept",
      autoSaveData: JSON.stringify({ nested: [{ 도메인관리PW: "domain-secret" }] }),
    };
    const encrypted = encryptSubmissionSecrets(source, "user-1", KEY);
    expect(encrypted.GmailPW).toMatch(/^spenc:v1:/);
    expect(encrypted.해외결제카드CVC).toMatch(/^spenc:v1:/);
    expect(JSON.parse(encrypted.autoSaveData).nested[0].도메인관리PW).toMatch(/^spenc:v1:/);
    expect(encrypted.일반값).toBe("kept");
    expect(decryptSubmissionSecrets(encrypted, "user-1", KEY)).toEqual(source);
  });

  it("rejects missing, malformed, wrong-key, and cross-user decryptions", () => {
    expect(() => encryptSubmissionSecrets({ GmailPW: "secret" }, "user-1")).toThrow(
      "SUBMISSION_ENCRYPTION_KEY is required",
    );
    const encrypted = encryptSubmissionSecrets({ GmailPW: "secret" }, "user-1", KEY);
    expect(() => decryptSubmissionSecrets(encrypted, "user-2", KEY)).toThrow(
      "Unable to decrypt submission secret",
    );
    expect(() => decryptSubmissionSecrets(encrypted, "user-1", OTHER_KEY)).toThrow(
      "Unable to decrypt submission secret",
    );
    expect(() => decryptSubmissionSecrets({ GmailPW: "spenc:v1:bad" }, "user-1", KEY)).toThrow(
      "Invalid encrypted submission secret",
    );
  });

  it("does not encrypt twice and preserves Slack-only markers", () => {
    const first = encryptSubmissionSecrets({ GmailPW: "secret", 해외결제카드앞면URL: "SLACK_ONLY" }, "user-1", KEY);
    expect(encryptSubmissionSecrets(first, "user-1", KEY)).toEqual(first);
  });

  it("masks nonempty secrets while retaining empty values and Slack-only markers", () => {
    expect(
      maskSubmissionSecrets({ GmailPW: "secret", 도메인관리PW: "", 해외결제카드앞면URL: "SLACK_ONLY", other: null }),
    ).toEqual({ GmailPW: MASKED_SECRET, 도메인관리PW: "", 해외결제카드앞면URL: "SLACK_ONLY", other: null });
  });

  it("keeps the default mask shallow and supports recursive response masking", () => {
    const nested = { user: { submission: { GmailPW: "secret" } }, list: [{ 도메인관리PW: "domain" }], autoSaveData: { GmailPW: "secret" } };
    expect(maskSubmissionSecrets(nested).user.submission.GmailPW).toBe("secret");
    expect(maskSubmissionSecrets(nested).autoSaveData.GmailPW).toBe(MASKED_SECRET);
    expect(maskSubmissionSecretsDeep(nested)).toEqual({
      user: { submission: { GmailPW: MASKED_SECRET } },
      list: [{ 도메인관리PW: MASKED_SECRET }],
      autoSaveData: { GmailPW: MASKED_SECRET },
    });
  });

  it("drops only known masked secret fields before a write", () => {
    expect(
      dropMaskedSecretFields({ GmailPW: MASKED_SECRET, 일반값: MASKED_SECRET, autoSaveData: { 도메인관리PW: MASKED_SECRET } }),
    ).toEqual({ 일반값: MASKED_SECRET, autoSaveData: {} });
  });

  it("does not require a key for records without stored secrets and preserves dates", () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    expect(encryptSubmissionSecrets({ createdAt }, "user-1")).toEqual({ createdAt });
  });

  it("rejects object and array values in known auto-save secret fields", () => {
    expect(() => encryptSubmissionSecrets({ autoSaveData: { GmailPW: { value: "secret" } } }, "user-1", KEY)).toThrow(
      "Invalid submission secret type: GmailPW",
    );
    expect(() => decryptSubmissionSecrets({ autoSaveData: [{ 도메인관리PW: ["secret"] }] }, "user-1")).toThrow(
      "Invalid submission secret type: 도메인관리PW",
    );
    expect(maskSubmissionSecrets({ autoSaveData: { GmailPW: { value: "secret" } } })).toEqual({
      autoSaveData: { GmailPW: MASKED_SECRET },
    });
    expect(maskSubmissionSecretsDeep({ user: { submission: { GmailPW: { value: "secret" } } } })).toEqual({
      user: { submission: { GmailPW: MASKED_SECRET } },
    });
  });

  it("accepts the environment key when explicitly configured", () => {
    process.env.SUBMISSION_ENCRYPTION_KEY = KEY;
    const encrypted = encryptSubmissionSecrets({ GmailPW: "secret" }, "user-1");
    expect(decryptSubmissionSecrets(encrypted, "user-1")).toEqual({ GmailPW: "secret" });
  });
});
