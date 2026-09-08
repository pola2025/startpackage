import manifest from "../../prisma/d1/schema-manifest.json";

export function decodeRow(table: string, row: Record<string, unknown>): Record<string, unknown> {
  const schema = manifest.tables.find(item => item.name === table);
  if (!schema) throw new Error("Unknown D1 table");
  const result = { ...row };
  for (const field of schema.fields) {
    const value = result[field.name];
    if (value === null || value === undefined) continue;
    if (field.array || field.type === "Json") {
      if (typeof value !== "string") throw new Error("Invalid stored JSON");
      result[field.name] = JSON.parse(value);
    } else if (field.type === "Boolean") {
      if (value !== 0 && value !== 1) throw new Error("Invalid stored boolean");
      result[field.name] = value === 1;
    } else if (field.type === "DateTime") {
      if (typeof value !== "number" || !Number.isSafeInteger(value)) throw new Error("Invalid stored date");
      result[field.name] = new Date(value);
    }
  }
  return result;
}
