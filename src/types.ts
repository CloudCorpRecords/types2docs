/**
 * types2docs types.
 *
 * types2docs renders a markdown API reference from
 * caller-supplied TypeScript type declaration facts
 * only. For each declaration the caller supplies its
 * name, its kind ("interface", "type", "enum", or
 * "function"), optionally its doc comment text, and the
 * kind-specific payload: members for interfaces and
 * enums, the definition text for a type alias, and the
 * signature text for a function. An optional document
 * title may also be supplied. From that data alone, as
 * pure local computation, types2docs reports:
 *
 *   - the rendered markdown document, in the pinned
 *     deterministic layout: a "# " title line, then one
 *     section per declaration in input order, paragraphs
 *     and sections separated by exactly one blank line,
 *     and exactly one trailing newline
 *   - counts: how many declarations were supplied, one
 *     tally per kind, and the total member count across
 *     interfaces and enums
 *
 * Nothing is invented: every string in the output comes
 * from the input, verbatim.
 */

/** Declaration kind of one documented type. */
export type DeclarationKind = "interface" | "type" | "enum" | "function";

/** One member of an interface or enum declaration. */
export interface TypeMember {
  /** Member name, echoed verbatim. */
  name: string;
  /** Member type text (interface members only). */
  type?: string;
  /** Enum member value text (enum members only). */
  value?: string;
  /** Whether the member is optional (interface members only). */
  optional?: boolean;
  /** Doc comment text for the member. */
  doc?: string;
}

/** One validated type declaration, in document order. */
export interface TypeDeclaration {
  /** Declared name, echoed verbatim. */
  name: string;
  /** Declaration kind. */
  kind: DeclarationKind;
  /** Doc comment text for the declaration, when present. */
  doc?: string;
  /** Members (interfaces and enums only). */
  members?: TypeMember[];
  /** The alias's right-hand side, verbatim (type aliases only). */
  definition?: string;
  /** The function signature, verbatim (functions only). */
  signature?: string;
}

/** Declaration tallies plus the total member count. */
export interface Types2DocsCounts {
  /** Number of declarations supplied. */
  types: number;
  /** Declarations of kind "interface". */
  interfaces: number;
  /** Declarations of kind "type". */
  type_aliases: number;
  /** Declarations of kind "enum". */
  enums: number;
  /** Declarations of kind "function". */
  functions: number;
  /** Members totalled across interfaces and enums only. */
  members: number;
}

/** The full API reference render. */
export interface Types2DocsResult {
  /** The rendered markdown document. */
  markdown: string;
  /** Declaration and member tallies. */
  counts: Types2DocsCounts;
}
