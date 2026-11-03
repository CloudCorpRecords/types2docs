# types2docs — Build Report

MCP Rebuild 1000, Batch 19. Original program build from the
packages-100 plan (cluster G #77), built from the spec in
`~/workspace/mcp-rebuild-100/specs-batch19/types2docs.md`
(read first). There is no external original; the tool surface
is the program's defined spec. Local build only — nothing
pushed or published.

Identity: repo `types2docs`, npm `@reneturcios/types2docs`,
MCP name `io.github.CloudCorpRecords/types2docs`, version
`0.1.0`, bin `types2docs` → `dist/cli.js`.

## Files created (19/19 per TEMPLATE.md checklist)

- `package.json`, `server.json` (description "Render a
  markdown API reference from caller-supplied TypeScript
  type declarations." — 82 chars, verified by count; npm
  entry carries `version: 0.1.0`; OCI entry
  `ghcr.io/cloudcorprecords/types2docs:0.1.0` carries **no**
  `version` field), `Dockerfile` (node:20-alpine two-stage,
  label
  `io.modelcontextprotocol.server.name="io.github.CloudCorpRecords/types2docs"`),
  `tsconfig.json` (byte-identical to the reference),
  `.gitignore`, `LICENSE` (MIT, Copyright (c) 2026 Rene
  Turcios), `README.md` (fresh text), `CHANGELOG.md`
  (single 0.1.0 entry, 2026-10-27), `package-lock.json`
  (Route 3, see below)
- `src/index.ts`, `src/cli.ts` (`render --input <args.json>`
  where the file holds the full arguments object, `mcp`,
  `--version`; exit 2 usage / 1 runtime error, argument
  validation before any file read), `src/mcp.ts`,
  `src/types.ts`, `src/types2docs.ts` (core,
  `VERSION = "0.1.0"`, `renderApiReference`, `formatPayload`)
- `test/types2docs.test.ts`
- `.github/workflows/{ci,publish,publish-container,registry-publish}.yml`
  (publish-container `IMAGE = ghcr.io/cloudcorprecords/types2docs`,
  smoke-test server-name assertion `types2docs`; the other
  three workflows are byte-identical to the reference)

Plus the parity fixture at
`harness/fixtures/types2docs-tools-original.json`, labelled
as a program spec from the packages-100 plan cluster G #77.

## Tools implemented (1)

- `render_api_reference` — arguments: `types` (array,
  required, at least 1 item) and `title` (string, optional,
  default "API Reference"; an empty string is allowed and
  renders as "# "). Each type item: `name` (string,
  required, non-empty), `kind` (string, required, exactly
  one of "interface", "type", "enum", "function"), `doc`
  (string, optional), `members` (array, conditional — see
  below), `definition` (string, conditional), and
  `signature` (string, conditional). Each member item:
  `name` (string, required, non-empty), `type` (string,
  conditional), `value` (string, optional, enum members
  only), `optional` (boolean, optional, absent means
  false, interface members only), and `doc` (string,
  optional). Required is exactly `["types"]` at the top
  level, `["name", "kind"]` per type item, and `["name"]`
  per member item in the schema literal.

  Kind-specific structural rules (a present forbidden
  field is a validation error naming the path):
  - interface: `members` REQUIRED (empty allowed); each
    member requires `name` and `type`; `value` forbidden
    on members; `definition`/`signature` forbidden.
  - enum: `members` REQUIRED (empty allowed); each member
    requires `name`; `type` and `optional` forbidden on
    members; `definition`/`signature` forbidden.
  - type: `definition` REQUIRED (a string, may be empty);
    `members` and `signature` forbidden.
  - function: `signature` REQUIRED (a string, may be
    empty); `members` and `definition` forbidden.

  Returns `{markdown, counts}`, where `markdown` is the
  rendered document in the exact pinned layout — "# " +
  title, then per declaration in input order: "## " +
  name, the doc text as its own paragraph when present
  (an empty-string doc yields an empty paragraph), a
  "Kind: <kind>" line, and the kind body (interface:
  table with "| Member | Type | Required |" header and
  yes/no from `optional`, followed when any member has a
  doc by one "- `<name>` — <doc>" line per documented
  member, or "(no members)" for an empty interface; enum:
  one line per member with " = <value>" only when a value
  is present and " — <doc>" appended when a doc is
  present, or "(no members)"; type: a ts fenced block
  "type <name> = <definition>"; function: a ts fenced
  block with the signature verbatim) — paragraphs and
  sections separated by exactly one blank line and the
  document ending with exactly one trailing newline.
  `counts` is `{types, interfaces, type_aliases, enums,
  functions, members}` in that key order, with `members`
  totalling members across interfaces and enums only.

  The fixture literal
  (`harness/fixtures/types2docs-tools-original.json`) and
  the `src/mcp.ts` literal are identical, with no
  `$schema` and no `additionalProperties` — confirmed by
  the parity run below.

## Implementation notes

- `src/mcp.ts` uses the SDK's low-level `Server` with an
  explicit inputSchema literal exactly matching the
  fixture, per the standing fleet rule (no McpServer/zod
  schema conversion). Every `tools/call` is validated by
  the core itself, so the MCP and CLI paths share one
  validation implementation; the core takes the full
  arguments object.
- Validation is path-naming and total: `types` missing,
  not an array, or empty; a non-object item; `name`
  missing/empty/non-string; `kind` missing or outside the
  pinned four; `doc` present but not a string; the
  kind-specific required/forbidden rules above at both
  the declaration and the member level; `title` present
  but not a string — each throws an Error naming the
  offending path (matching the spec's example
  `types[1].members[0].type is required for interface
  members`) and produces no partial result (MCP:
  `isError`; CLI: exit 1). Duplicate type names throw
  `duplicate type name: <name>`; duplicate member names
  within one declaration throw a path-naming error.
  Unknown extra fields are ignored, including inside
  items and members; a non-object top-level argument is
  treated as {}.

## Verification (foreground, this session)

- `npm test` (`tsx --test test/*.test.ts`): **67 tests,
  67 pass, 0 fail** — exact full-document markdown
  strings for one declaration of each kind (interface
  table with Required yes/no from absent/false/true
  `optional`, member-doc lines in supplied order skipping
  undocumented members, an empty-string member type
  rendered verbatim; type alias with and without a doc
  and with an empty-string definition; enum with values
  and docs, without values, and with an empty-string
  value; function with a single-line, multi-line, and
  empty-string signature); document framing (default
  title, custom title, empty-string title rendering as
  "# ", an empty-string doc paragraph with the standard
  blank lines, a full four-kind document in input order,
  exactly one trailing newline, verbatim emission of
  markdown/space-heavy strings); counts with the pinned
  key order and members totalled across interfaces and
  enums only; duplicate type names naming the name,
  duplicate member names in interfaces and enums naming
  the path, the same member name in different
  declarations accepted, case-distinct type names
  accepted; and every validation path (types missing /
  non-array / empty, non-object items, name and kind
  missing / empty / non-string / outside the four, doc
  and title non-string, and for each kind every required
  and forbidden field — interface members missing /
  non-array, member name and type paths including the
  spec's exact example message, member value forbidden,
  member optional non-boolean, member doc non-string;
  enum member type and optional forbidden; type
  definition missing / non-string and members /
  signature forbidden including an empty members array;
  function signature missing / non-string and members /
  definition forbidden — plus non-object top-level
  treated as {}, unknown extras ignored, no partial
  result).
- `npx tsc --noEmit` → exit 0; `npm run build` produced
  `dist/` with all 15 outputs.
- `dist/cli.js --version` → `0.1.0`; unknown command exits
  2 with usage; `render` with no `--input` exits 2;
  `render --input <valid file>` exits 0 and prints the
  hand-checked render for a four-declaration input
  (interface `Point` with doc, table, and one member-doc
  line; type alias `PointJson` fenced as
  `type PointJson = { x: number; y: number }`; enum
  `Axis` rendering `- \`X\` = "x"` and a bare `- \`Y\``;
  function `makePoint` with its signature verbatim;
  counts types 4 with one of each kind and members 4);
  `render --input <invalid file>` (an interface member
  missing its `type` in `types[1]`) exits 1 with
  `error: types[1].members[0].type is required for interface members`.
- Parity: `harness/parity.py` vs
  `harness/fixtures/types2docs-tools-original.json` →
  **PASS, parity 100.0, identical_tools 1/1** (run with
  the rebuild path as an absolute path; the harness does
  not expand a `~` inside the quoted stdio command
  string). Report saved under `parity-out/`.

## Lockfile status

`package-lock.json` generated clean via Route 3 (in the
build directory with no `node_modules` present, offline
`npm install --package-lock-only --ignore-scripts
--offline`), verified: parses, name
`@reneturcios/types2docs`, **128 package entries**. The
subsequent offline `npm install --ignore-scripts
--offline`, build, tests, and parity all ran against
this lockfile's tree.

## Gaps / honest notes

- **Pinned judgement calls** (each with a dedicated test
  where applicable): (1) interface member-doc lines form
  their own paragraph after the table — the spec says the
  table is "followed" by the doc lines and that paragraphs
  inside a section are separated by exactly one blank
  line, so the table and the doc-line list are separate
  paragraphs; (2) following the fleet convention, a field
  whose value is `undefined` counts as absent (JSON
  inputs cannot carry `undefined`; a present-but-undefined
  forbidden field therefore does not error, and a
  present-but-undefined required field errors as
  missing); (3) an interface member's `type` is required
  and must be a string, but the spec does not pin it
  non-empty (unlike `name`, which it does), so an
  empty-string type is accepted and rendered verbatim;
  (4) error-message wording follows the fleet's
  path-naming pattern, distinguishing a missing field
  (`types[0].definition is required for type`) from a
  malformed one (`types[0].definition must be a string`)
  and a forbidden one (`types[0].members is forbidden for
  type`), matching the spec's one exact example message
  verbatim. No other spec ambiguity was found in the core
  behaviour.
- Container build not exercised locally; the
  publish-container workflow smoke-tests the image at
  publish time.
- Nothing pushed or published; this is a local build only.
