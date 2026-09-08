from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "prisma" / "schema.prisma"
DEFAULT_OUTPUT = ROOT / "prisma" / "d1" / "0001_initial.sql"
DEFAULT_MANIFEST = ROOT / "prisma" / "d1" / "schema-manifest.json"

SCALAR_TYPES = {"String", "Int", "Boolean", "DateTime", "Json", "Bytes", "Float", "Decimal"}


def unquote(value: str) -> str:
    value = value.strip()
    if value.startswith('"') and value.endswith('"'):
        return value[1:-1].replace('\\"', '"')
    return value


def split_fields(line: str) -> tuple[str, str, bool, bool, str] | None:
    match = re.match(r"^\s*(\S+)\s+([A-Za-z][A-Za-z0-9_]*)(\[\])?(\?)?\s*(.*)$", line)
    if not match:
        return None
    name, type_name, list_suffix, optional_suffix, attributes = match.groups()
    return name, type_name, bool(list_suffix), bool(optional_suffix), attributes.split("//", 1)[0].strip()


def parse_schema(source: str) -> tuple[list[dict], dict[str, str]]:
    enum_values: dict[str, str] = {}
    enums = re.findall(r"enum\s+(\w+)\s*\{(.*?)\}", source, re.S)
    for enum_name, body in enums:
        values = [line.strip().split()[0] for line in body.splitlines() if line.strip() and not line.strip().startswith("//")]
        enum_values[enum_name] = values

    models: list[dict] = []
    model_match = re.compile(r"model\s+(\w+)\s*\{(.*?)\n\}", re.S)
    for model_name, body in model_match.findall(source):
        fields = []
        indexes: list[tuple[str, list[str]]] = []
        map_name = model_name
        for raw in body.splitlines():
            line = raw.strip()
            if not line or line.startswith("//"):
                continue
            map_match = re.match(r"@@map\(\"([^\"]+)\"\)", line)
            if map_match:
                map_name = map_match.group(1)
                continue
            index_match = re.match(r"@@(unique|index)\(\[([^]]+)\]\)", line)
            if index_match:
                kind, columns = index_match.groups()
                indexes.append((kind, [column.strip() for column in columns.split(",")]))
                continue
            field = split_fields(raw)
            if not field:
                continue
            name, type_name, is_list, optional, attributes = field
            fields.append({
                "name": name,
                "type": type_name,
                "list": is_list,
                "optional": optional,
                "attributes": attributes,
                "relation": "@relation" in attributes,
            })
        models.append({"name": model_name, "table": map_name, "fields": fields, "indexes": indexes})
    model_names = {model["name"] for model in models}
    for model in models:
        for field in model["fields"]:
            field["relation"] = field["relation"] or field["type"] in model_names
    return models, enum_values


def sql_identifier(value: str) -> str:
    return '"' + value.replace('"', '""') + '"'


def sql_literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def default_sql(field: dict) -> str | None:
    match = re.search(r"@default\((now\(\)|cuid\(\)|\[\]|[^)]*)\)", field["attributes"])
    if not match:
        return None
    value = match.group(1).strip()
    if value == "now()":
        return "(unixepoch('now') * 1000)"
    if value == "cuid()":
        return None
    if value == "true":
        return "1"
    if value == "false":
        return "0"
    if value == "[]":
        return sql_literal("[]")
    if value.startswith('"'):
        return sql_literal(unquote(value))
    return sql_literal(value)


def column_type(field: dict, enum_values: dict[str, list[str]]) -> str:
    if field["list"] or field["type"] == "Json":
        return "TEXT"
    if field["type"] == "Int":
        return "INTEGER"
    if field["type"] == "Boolean":
        return "INTEGER"
    if field["type"] == "DateTime":
        return "INTEGER"
    return "TEXT"


def relation_fk(field: dict) -> tuple[str, str, str, str, bool] | None:
    match = re.search(r"@relation\(fields:\s*\[([^]]+)\],\s*references:\s*\[([^]]+)\](?:,\s*onDelete:\s*(\w+))?", field["attributes"])
    if not match:
        return None
    local, target, on_delete = match.groups()
    return local.strip(), target.strip(), on_delete or ("SET NULL" if field["optional"] else "RESTRICT"), field["type"], field["optional"]


def generate(source: str) -> str:
    models, enum_values = parse_schema(source)
    table_by_model = {model["name"]: model["table"] for model in models}
    lines = [
        "-- GENERATED FILE: python scripts/d1/generate_schema.py",
        "-- Source: prisma/schema.prisma",
        "-- SQLite/D1; regenerate instead of editing this file by hand.",
        "PRAGMA foreign_keys = ON;",
        "",
    ]
    unique_names: set[str] = set()
    for model in models:
        columns = []
        field_names = {field["name"] for field in model["fields"] if not field["relation"]}
        for field in model["fields"]:
            if field["relation"]:
                continue
            name = field["name"]
            parts = [sql_identifier(name), column_type(field, enum_values)]
            if name == "id":
                parts.append("PRIMARY KEY")
            if "@unique" in field["attributes"]:
                parts.append("UNIQUE")
            if not field["optional"] and not field["list"]:
                parts.append("NOT NULL")
            default = default_sql(field)
            if default is not None:
                parts.extend(["DEFAULT", default])
            if field["type"] == "Boolean":
                parts.append("CHECK (" + sql_identifier(name) + " IN (0, 1))")
            if field["list"]:
                parts.append("CHECK (" + sql_identifier(name) + " IS NULL OR (json_valid(" + sql_identifier(name) + ") AND json_type(" + sql_identifier(name) + ") = 'array'))")
            elif field["type"] == "Json":
                parts.append("CHECK (" + sql_identifier(name) + " IS NULL OR json_valid(" + sql_identifier(name) + "))")
            if field["type"] in enum_values and not field["list"]:
                allowed = ", ".join(sql_literal(value) for value in enum_values[field["type"]])
                parts.append("CHECK (" + sql_identifier(name) + " IN (" + allowed + "))")
            columns.append("  " + " ".join(parts))

        for field in model["fields"]:
            if not field["relation"]:
                continue
            relation = relation_fk(field)
            if not relation:
                continue
            local, target, on_delete, related_model, _ = relation
            if local not in field_names:
                raise ValueError(f"Relation field {model['name']}.{field['name']} refers to missing scalar {local}")
            columns.append(
                "  FOREIGN KEY (" + sql_identifier(local) + ") REFERENCES " +
                sql_identifier(table_by_model[related_model]) + " (" + sql_identifier(target) + ") ON DELETE " + on_delete.upper() + " ON UPDATE CASCADE"
            )
        lines.append("CREATE TABLE " + sql_identifier(model["table"]) + " (")
        lines.append(",\n".join(columns))
        lines.append(");")
        lines.append("")

        for kind, index_columns in model["indexes"]:
            name = model["table"] + "_" + "_".join(index_columns) + ("_key" if kind == "unique" else "_idx")
            if kind == "unique":
                name += "_unique"
            name = name[:60]
            unique_names.add(name)
            lines.append("CREATE " + ("UNIQUE " if kind == "unique" else "") + "INDEX " + sql_identifier(name) + " ON " + sql_identifier(model["table"]) + " (" + ", ".join(sql_identifier(column) for column in index_columns) + ");")
        lines.append("")

    keyset_indexes = [
        ("users", "users_cohort_status_created_id_keyset", ["cohortId", "status", "createdAt", "id"]),
        ("workflows", "workflows_user_status_created_id_keyset", ["userId", "status", "createdAt", "id"]),
        ("workflow_logs", "workflow_logs_workflow_created_id_keyset", ["workflowId", "createdAt", "id"]),
        ("design_history", "design_history_workflow_created_id_keyset", ["workflowId", "createdAt", "id"]),
        ("design_thread_messages", "design_thread_messages_thread_created_id_keyset", ["threadId", "createdAt", "id"]),
        ("communication_threads", "communication_threads_user_last_reply_id_keyset", ["userId", "lastReplyAt", "id"]),
        ("communication_threads", "communication_threads_status_last_reply_id_keyset", ["status", "lastReplyAt", "id"]),
        ("communication_messages", "communication_messages_thread_created_id_keyset", ["threadId", "createdAt", "id"]),
        ("notifications", "notifications_user_created_id_keyset", ["userId", "createdAt", "id"]),
        ("users", "users_phone_idx", ["연락처"]),
        ("design_thread_messages", "design_thread_messages_thread_type_created_id_keyset", ["threadId", "messageType", "createdAt", "id"]),
    ]
    for table, name, columns in keyset_indexes:
        if name not in unique_names:
            lines.append("CREATE INDEX " + sql_identifier(name) + " ON " + sql_identifier(table) + " (" + ", ".join(sql_identifier(column) for column in columns) + ");")
    lines.append("")
    return "\n".join(lines)


def manifest(source: str) -> dict:
    models, _ = parse_schema(source)
    return {
        "source": "prisma/schema.prisma",
        "tables": [
            {
                "name": model["table"],
                "model": model["name"],
                "fields": [
                    {
                        "name": field["name"],
                        "type": field["type"],
                        "array": field["list"],
                        "nullable": field["optional"] or field["list"],
                        "prismaRequired": not field["optional"],
                    }
                    for field in model["fields"]
                    if not field["relation"]
                ],
            }
            for model in models
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=SOURCE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    args = parser.parse_args()
    source = args.source.read_text(encoding="utf-8")
    output = generate(source)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(output, encoding="utf-8", newline="\n")
    args.manifest.write_text(json.dumps(manifest(source), ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(f"generated {args.output} ({output.count('CREATE TABLE')} tables)")


if __name__ == "__main__":
    main()
