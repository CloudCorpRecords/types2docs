/**
 * types2docs core: render a markdown API reference from
 * caller-supplied TypeScript type declarations.
 *
 *   renderApiReference(args) -> { markdown, counts }
 *
 * Kind-specific field rules are STRUCTURAL validation
 * (a present forbidden field is a validation error
 * naming the path; "present" follows the fleet
 * convention that a value of undefined counts as
 * absent):
 *   - interface: `members` REQUIRED (an empty array is
 *     allowed); each member requires `name` and `type`;
 *     `value` must be absent on members; `definition`
 *     and `signature` must be absent on the item.
 *   - enum: `members` REQUIRED (empty allowed); each
 *     member requires `name`; `type` and `optional`
 *     must be absent on members; `definition` and
 *     `signature` must be absent on the item.
 *   - type: `definition` REQUIRED (a string, may be
 *     empty); `members` and `signature` must be absent.
 *   - function: `signature` REQUIRED (a string, may be
 *     empty); `members` and `definition` must be absent.
 *
 * Duplicate type names are a validation error
 * ("duplicate type name: X"). Duplicate member names
 * within one declaration are a validation error naming
 * the path.
 *
 * Rendering (exact; sections in input order; paragraphs
 * and sections separated by exactly one blank line; the
 * document ends with exactly one trailing newline):
 *   - The document opens with "# " + title (default
 *     "API Reference").
 *   - Each declaration section is "## " + name, then
 *     the doc text as its own paragraph exactly as
 *     supplied when `doc` is present (an empty-string
 *     doc yields an empty paragraph), then a kind line
 *     "Kind: <kind>", then the kind body.
 *   - Interface body: with members, a table with header
 *     "| Member | Type | Required |" and separator
 *     "| --- | --- | --- |", then one row per member
 *     "| <name> | <type> | <yes|no> |" (yes when
 *     optional is absent/false, no when true). When at
 *     least one member has a doc, the table is followed
 *     (as its own paragraph) by one line per documented
 *     member: "- `<name>` — <doc>". Zero members renders
 *     the single line "(no members)".
 *   - Enum body: one line per member: "- `<name>` =
 *     <value>" when value is present, else "- `<name>`";
 *     when the member has a doc, " — <doc>" is appended.
 *     Zero members renders "(no members)".
 *   - Type body: a fenced block "```ts", then
 *     "type <name> = <definition>", then "```".
 *   - Function body: a fenced block "```ts", then the
 *     signature verbatim, then "```".
 * No trailing spaces are added anywhere; input strings
 * are emitted verbatim.
 *
 * counts keys are in the order {types, interfaces,
 * type_aliases, enums, functions, members}; members
 * totals members across interfaces and enums only.
 *
 * Validation is strict and path-naming: any malformed
 * input throws an Error naming the offending path and
 * no partial result is produced. Unknown extra fields
 * are ignored, including inside items and members; a
 * non-object top-level argument is treated as {}.
 */
import type {
  DeclarationKind,
  TypeDeclaration,
  TypeMember,
  Types2DocsCounts,
  Types2DocsResult,
} from "./types.js";

export const VERSION = "0.1.0";

const KINDS: readonly string[] = ["interface", "type", "enum", "function"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function present(obj: Record<string, unknown>, key: string): boolean {
  return obj[key] !== undefined;
}

function parseMember(
  item: unknown,
  typeIndex: number,
  memberIndex: number,
  kind: "interface" | "enum",
): TypeMember {
  const at = `types[${typeIndex}].members[${memberIndex}]`;
  if (!isRecord(item)) throw new Error(`${at} must be an object`);

  if (item.name === undefined) throw new Error(`${at}.name is required`);
  if (typeof item.name !== "string" || item.name.length === 0) {
    throw new Error(`${at}.name must be a non-empty string`);
  }

  const member: TypeMember = { name: item.name };

  if (kind === "interface") {
    if (item.type === undefined) {
      throw new Error(`${at}.type is required for interface members`);
    }
    if (typeof item.type !== "string") {
      throw new Error(`${at}.type must be a string`);
    }
    member.type = item.type;

    if (present(item, "value")) {
      throw new Error(`${at}.value is forbidden for interface members`);
    }

    if (present(item, "optional")) {
      if (typeof item.optional !== "boolean") {
        throw new Error(`${at}.optional must be a boolean`);
      }
      member.optional = item.optional;
    }
  } else {
    if (present(item, "type")) {
      throw new Error(`${at}.type is forbidden for enum members`);
    }
    if (present(item, "optional")) {
      throw new Error(`${at}.optional is forbidden for enum members`);
    }
    if (present(item, "value")) {
      if (typeof item.value !== "string") {
        throw new Error(`${at}.value must be a string`);
      }
      member.value = item.value;
    }
  }

  if (present(item, "doc")) {
    if (typeof item.doc !== "string") {
      throw new Error(`${at}.doc must be a string`);
    }
    member.doc = item.doc;
  }

  return member;
}

function parseMembers(
  item: Record<string, unknown>,
  index: number,
  kind: "interface" | "enum",
): TypeMember[] {
  if (item.members === undefined) {
    throw new Error(`types[${index}].members is required for ${kind}`);
  }
  if (!Array.isArray(item.members)) {
    throw new Error(`types[${index}].members must be an array`);
  }
  const members = item.members.map((m, j) => parseMember(m, index, j, kind));
  const seen = new Set<string>();
  members.forEach((m, j) => {
    if (seen.has(m.name)) {
      throw new Error(
        `types[${index}].members[${j}].name is a duplicate member name: ${m.name}`,
      );
    }
    seen.add(m.name);
  });
  return members;
}

function parseDeclaration(item: unknown, index: number): TypeDeclaration {
  const at = `types[${index}]`;
  if (!isRecord(item)) throw new Error(`${at} must be an object`);

  if (item.name === undefined) throw new Error(`${at}.name is required`);
  if (typeof item.name !== "string" || item.name.length === 0) {
    throw new Error(`${at}.name must be a non-empty string`);
  }

  if (item.kind === undefined) throw new Error(`${at}.kind is required`);
  if (typeof item.kind !== "string" || !KINDS.includes(item.kind)) {
    throw new Error(
      `${at}.kind must be one of "interface", "type", "enum", "function"`,
    );
  }
  const kind = item.kind as DeclarationKind;

  const decl: TypeDeclaration = { name: item.name, kind };

  if (present(item, "doc")) {
    if (typeof item.doc !== "string") {
      throw new Error(`${at}.doc must be a string`);
    }
    decl.doc = item.doc;
  }

  if (kind === "interface" || kind === "enum") {
    if (present(item, "definition")) {
      throw new Error(`${at}.definition is forbidden for ${kind}`);
    }
    if (present(item, "signature")) {
      throw new Error(`${at}.signature is forbidden for ${kind}`);
    }
    decl.members = parseMembers(item, index, kind);
  } else if (kind === "type") {
    if (present(item, "members")) {
      throw new Error(`${at}.members is forbidden for type`);
    }
    if (present(item, "signature")) {
      throw new Error(`${at}.signature is forbidden for type`);
    }
    if (item.definition === undefined) {
      throw new Error(`${at}.definition is required for type`);
    }
    if (typeof item.definition !== "string") {
      throw new Error(`${at}.definition must be a string`);
    }
    decl.definition = item.definition;
  } else {
    // kind === "function"
    if (present(item, "members")) {
      throw new Error(`${at}.members is forbidden for function`);
    }
    if (present(item, "definition")) {
      throw new Error(`${at}.definition is forbidden for function`);
    }
    if (item.signature === undefined) {
      throw new Error(`${at}.signature is required for function`);
    }
    if (typeof item.signature !== "string") {
      throw new Error(`${at}.signature must be a string`);
    }
    decl.signature = item.signature;
  }

  return decl;
}

function renderInterfaceBody(decl: TypeDeclaration): string[] {
  const members = decl.members ?? [];
  if (members.length === 0) return ["(no members)"];
  const lines = [
    "| Member | Type | Required |",
    "| --- | --- | --- |",
    ...members.map(
      (m) => `| ${m.name} | ${m.type} | ${m.optional === true ? "no" : "yes"} |`,
    ),
  ];
  const blocks = [lines.join("\n")];
  const documented = members.filter((m) => m.doc !== undefined);
  if (documented.length > 0) {
    blocks.push(documented.map((m) => `- \`${m.name}\` — ${m.doc}`).join("\n"));
  }
  return blocks;
}

function renderEnumBody(decl: TypeDeclaration): string[] {
  const members = decl.members ?? [];
  if (members.length === 0) return ["(no members)"];
  const lines = members.map((m) => {
    let line = `- \`${m.name}\``;
    if (m.value !== undefined) line += ` = ${m.value}`;
    if (m.doc !== undefined) line += ` — ${m.doc}`;
    return line;
  });
  return [lines.join("\n")];
}

function renderDeclaration(decl: TypeDeclaration): string[] {
  const blocks: string[] = [`## ${decl.name}`];
  if (decl.doc !== undefined) blocks.push(decl.doc);
  blocks.push(`Kind: ${decl.kind}`);
  if (decl.kind === "interface") {
    blocks.push(...renderInterfaceBody(decl));
  } else if (decl.kind === "enum") {
    blocks.push(...renderEnumBody(decl));
  } else if (decl.kind === "type") {
    blocks.push("```ts\n" + `type ${decl.name} = ${decl.definition}` + "\n```");
  } else {
    blocks.push("```ts\n" + `${decl.signature}` + "\n```");
  }
  return blocks;
}

/** Render a markdown API reference from supplied type declarations. */
export function renderApiReference(args: unknown): Types2DocsResult {
  const raw: Record<string, unknown> = isRecord(args) ? args : {};

  if (raw.types === undefined) throw new Error("types is required");
  if (!Array.isArray(raw.types) || raw.types.length === 0) {
    throw new Error("types must be a non-empty array");
  }

  let title = "API Reference";
  if (present(raw, "title")) {
    if (typeof raw.title !== "string") {
      throw new Error("title must be a string");
    }
    title = raw.title;
  }

  const declarations = raw.types.map((item, i) => parseDeclaration(item, i));

  const seen = new Set<string>();
  for (const d of declarations) {
    if (seen.has(d.name)) {
      throw new Error(`duplicate type name: ${d.name}`);
    }
    seen.add(d.name);
  }

  const blocks: string[] = [`# ${title}`];
  for (const d of declarations) {
    blocks.push(...renderDeclaration(d));
  }
  const markdown = blocks.join("\n\n") + "\n";

  const counts: Types2DocsCounts = {
    types: declarations.length,
    interfaces: 0,
    type_aliases: 0,
    enums: 0,
    functions: 0,
    members: 0,
  };
  for (const d of declarations) {
    if (d.kind === "interface") {
      counts.interfaces += 1;
      counts.members += (d.members ?? []).length;
    } else if (d.kind === "type") {
      counts.type_aliases += 1;
    } else if (d.kind === "enum") {
      counts.enums += 1;
      counts.members += (d.members ?? []).length;
    } else {
      counts.functions += 1;
    }
  }

  return { markdown, counts };
}

/** Render a payload as the JSON text block MCP clients show. */
export function formatPayload(payload: unknown): string {
  return typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
}
