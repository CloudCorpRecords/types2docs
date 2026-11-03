# types2docs

Documenting a TypeScript API usually means keeping a
markdown reference in step with the types by hand, and
the two drift apart. types2docs takes the other route:
you supply the declaration facts you already have —
each declaration's name, whether it is an interface, a
type alias, an enum, or a function, its doc comment,
and the kind-specific payload (the members, the alias's
right-hand side, or the function signature) — and it
renders the reference from those facts alone, in one
pinned layout. Nothing is invented and nothing is
reworded: every string in the document comes from your
input, verbatim.

The layout never varies. The document opens with a
`# ` title line — "API Reference" unless you supply a
`title` — followed by one section per declaration, in
the order you supplied them. Each section is a
`## ` heading with the declared name, the doc text as
its own paragraph when one is present, a
`Kind: <kind>` line, and then the kind body. An
interface renders as a table with one row per member —
member name, type text, and whether the member is
required (`yes` when `optional` is absent or false,
`no` when it is true) — followed by one line per
documented member collecting its doc comment. An enum
renders one line per member, with ` = <value>` when a
value is present and the member's doc comment appended
when it has one. An interface or enum with no members
renders the single line `(no members)`. A type alias
and a function each render as a fenced `ts` block: for
an alias, `type <name> = <definition>`; for a function,
the signature exactly as supplied. Paragraphs and
sections are separated by exactly one blank line, and
the document ends with exactly one trailing newline.
Alongside the markdown, the result carries counts: how
many declarations were supplied, one tally per kind,
and how many members the interfaces and enums hold in
total.

The kind rules are structural, and breaking one is a
validation error, not a rendering choice. `members` is
required for interfaces and enums and forbidden for
type aliases and functions. `definition` is required
for a type alias and forbidden for every other kind;
`signature` is required for a function and forbidden
for every other kind. Inside members, `type` is
required for interface members and forbidden for enum
members, `value` belongs to enum members only, and
`optional` is forbidden on enum members. Two
declarations with the same name, or two members with
the same name inside one declaration, are errors too.
Every validation error names the offending path — for
example `types[1].members[0].type is required for
interface members` — and no partial document is
produced. Unknown extra fields are ignored, including
inside declarations and members.

## CLI

```bash
npx @reneturcios/types2docs render --input args.json
npx @reneturcios/types2docs --version
```

`args.json` contains the full arguments object:

```json
{
  "title": "Widget API",
  "types": [
    {
      "name": "Widget",
      "kind": "interface",
      "doc": "A widget in the catalogue.",
      "members": [
        { "name": "id", "type": "string", "doc": "Unique identifier." },
        { "name": "label", "type": "string", "optional": true }
      ]
    },
    {
      "name": "WidgetId",
      "kind": "type",
      "definition": "string & { readonly brand: \"WidgetId\" }"
    },
    {
      "name": "Colour",
      "kind": "enum",
      "members": [
        { "name": "Red", "value": "\"red\"" },
        { "name": "Blue", "value": "\"blue\"", "doc": "The calm one." }
      ]
    },
    {
      "name": "makeWidget",
      "kind": "function",
      "signature": "function makeWidget(id: WidgetId): Widget"
    }
  ]
}
```

The render is printed as JSON:

```json
{
  "markdown": "# Widget API\n\n## Widget\n\nA widget in the catalogue.\n\nKind: interface\n\n| Member | Type | Required |\n| --- | --- | --- |\n| id | string | yes |\n| label | string | no |\n\n- `id` — Unique identifier.\n\n## WidgetId\n\nKind: type\n\n```ts\ntype WidgetId = string & { readonly brand: \"WidgetId\" }\n```\n\n## Colour\n\nKind: enum\n\n- `Red` = \"red\"\n- `Blue` = \"blue\" — The calm one.\n\n## makeWidget\n\nKind: function\n\n```ts\nfunction makeWidget(id: WidgetId): Widget\n```\n",
  "counts": {
    "types": 4,
    "interfaces": 1,
    "type_aliases": 1,
    "enums": 1,
    "functions": 1,
    "members": 4
  }
}
```

Exit codes: `0` on success, `1` on a runtime error
(including an unreadable or invalid input file, or
invalid input), `2` on a usage error.

## MCP server

```bash
npx -y @reneturcios/types2docs mcp
```

MCP client config:

```json
{
  "mcpServers": {
    "types2docs": {
      "command": "npx",
      "args": ["-y", "@reneturcios/types2docs", "mcp"]
    }
  }
}
```

### Tools

- `render_api_reference` — Render a markdown API
  reference from caller-supplied TypeScript type
  declarations: interfaces, type aliases, enums, and
  functions, in a pinned deterministic layout. Nothing
  is invented; every string comes from the input.
  - `types` (array, required, at least 1 item) — the
    type declarations to document, in document order;
    each item:
    - `name` (string, required, non-empty) — declared
      name
    - `kind` (string, required) — one of "interface",
      "type", "enum", or "function"
    - `doc` (string, optional) — doc comment text for
      the declaration
    - `members` (array) — required for interface and
      enum, forbidden for type and function; each item:
      - `name` (string, required, non-empty) — member
        name
      - `type` (string) — member type text; required
        for interface members, forbidden for enum
        members
      - `value` (string, optional) — enum member value
        text (enum members only)
      - `optional` (boolean, optional) — whether the
        member is optional (interface members only);
        absent means false
      - `doc` (string, optional) — doc comment text
        for the member
    - `definition` (string) — the alias's right-hand
      side, verbatim; required for kind "type",
      forbidden otherwise
    - `signature` (string) — the function signature,
      verbatim; required for kind "function", forbidden
      otherwise
  - `title` (string, optional) — document title;
    defaults to "API Reference"; an empty string is
    allowed and renders as `# `

  Returns `{markdown, counts}`, where `markdown` is
  the rendered document and `counts` is `{types,
  interfaces, type_aliases, enums, functions, members}`
  in that key order.

## Docker

```bash
docker run -i ghcr.io/cloudcorprecords/types2docs
docker run --rm -v "$PWD:/w" ghcr.io/cloudcorprecords/types2docs render --input /w/args.json
```

## Development

```bash
npm install
npm run build   # tsc -> dist/
npm test        # tsx --test test/*.test.ts (pure local, no network)
npm run dev     # run the CLI from source
```

## License

MIT — Copyright (c) 2026 Rene Turcios
