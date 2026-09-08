import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { encryptSubmissionSnapshot } from "./encrypt-submission-snapshot";

const KEY = Buffer.alloc(32, 7).toString("base64");

async function fixture(): Promise<{ input: string; output: string }> {
  const root = await mkdtemp(path.join(path.resolve(".omx/d1-migration"), "test-encrypt-"));
  const input = path.join(root, "input");
  const output = path.join(root, "output");
  const row = ["submission-1", "user-1", "secret", JSON.stringify({ GmailPW: "nested-secret" })];
  const page = JSON.stringify([row]);
  const { createHash } = await import("node:crypto");
  const manifest = {
    version: 1,
    complete: true,
    sourceSchemaSha256: "fixture",
    rows: 1,
    tables: [{ name: "submissions", fields: [
      { name: "id", type: "String", list: false, required: true },
      { name: "userId", type: "String", list: false, required: true },
      { name: "GmailPW", type: "String", list: false, required: false },
      { name: "autoSaveData", type: "Json", list: false, required: false },
    ], pages: [{ file: "Submission-00000.json", sha256: createHash("sha256").update(page).digest("hex"), rows: 1 }], rows: 1 }],
  };
  await (await import("node:fs/promises")).mkdir(input, { recursive: true });
  await writeFile(path.join(input, "Submission-00000.json"), page);
  await writeFile(path.join(input, "manifest.json"), JSON.stringify(manifest));
  return { input, output };
}

describe("encrypt-submission-snapshot", () => {
  it("dry-runs and writes a separate encrypted snapshot with row parity", async () => {
    const { input, output } = await fixture();
    try {
      const dry = await encryptSubmissionSnapshot(input, output, { key: KEY, dryRun: true });
      expect(dry.rows).toBe(1);
      expect(dry.encryptedRows).toBe(1);
      const result = await encryptSubmissionSnapshot(input, output, { key: KEY });
      expect(result.output).toBe(output);
      const page = JSON.parse(await readFile(path.join(output, "Submission-00000.json"), "utf8"));
      expect(page).toHaveLength(1);
      expect(page[0][2]).toMatch(/^spenc:v1:/);
      expect(page[0][3]).toContain("spenc:v1:");
      const outputManifest = JSON.parse(await readFile(path.join(output, "manifest.json"), "utf8"));
      expect(outputManifest.tables[0].name).toBe("submissions");
      expect(outputManifest.sourceSchemaSha256).toBe("fixture");
      expect(outputManifest.sourceSnapshotSchemaSha256).toBe("fixture");
      expect(outputManifest.targetSchemaSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(outputManifest.tables[0].pages[0].sha256).toBe(
        (await import("node:crypto")).createHash("sha256").update(await readFile(path.join(output, "Submission-00000.json"))).digest("hex"),
      );
      const rerun = await encryptSubmissionSnapshot(output, `${output}-rerun`, { key: KEY });
      expect(rerun.rows).toBe(1);
    } finally {
      await rm(path.dirname(input), { recursive: true, force: true });
    }
  });

  it("fails closed for malformed pages and leaves no output", async () => {
    const { input, output } = await fixture();
    await writeFile(path.join(input, "Submission-00000.json"), "not-json");
    try {
      await expect(encryptSubmissionSnapshot(input, output, { key: KEY })).rejects.toThrow();
      await expect(readFile(path.join(output, "manifest.json"))).rejects.toThrow();
    } finally {
      await rm(path.dirname(input), { recursive: true, force: true });
    }
  });

  it("fails closed when a submission has no userId", async () => {
    const { input, output } = await fixture();
    const pagePath = path.join(input, "Submission-00000.json");
    const page = JSON.parse(await readFile(pagePath, "utf8"));
    page[0][1] = null;
    const content = JSON.stringify(page);
    await writeFile(pagePath, content);
    const manifestPath = path.join(input, "manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    manifest.tables[0].pages[0].sha256 = (await import("node:crypto")).createHash("sha256").update(content).digest("hex");
    await writeFile(manifestPath, JSON.stringify(manifest));
    try {
      await expect(encryptSubmissionSnapshot(input, output, { key: KEY })).rejects.toThrow("has no userId");
    } finally {
      await rm(path.dirname(input), { recursive: true, force: true });
    }
  });
});
