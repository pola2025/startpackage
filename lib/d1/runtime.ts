import "server-only";

/** Switch all business reads and writes together after final synchronization. */
export function isD1RuntimeEnabled(): boolean {
  const value = process.env.D1_RUNTIME_ENABLED;
  if (value !== undefined && value !== "true" && value !== "false") {
    throw new Error("D1_RUNTIME_ENABLED must be true or false");
  }
  return value === "true";
}
