# Changelog

## 0.1.0 (2026-10-27)

- Initial release: `render_api_reference` MCP tool and
  `render` CLI command rendering a markdown API
  reference from caller-supplied TypeScript type
  declarations only; nothing is invented and every
  string in the output comes from the input, verbatim.
- Pinned deterministic layout: a `# ` title line
  (default "API Reference"), then one section per
  declaration in input order — `## ` heading, the doc
  text as its own paragraph when present, a
  `Kind: <kind>` line, and the kind body: a member
  table plus member-doc lines for interfaces, one line
  per member for enums, and a fenced `ts` block for
  type aliases and functions. Paragraphs and sections
  are separated by exactly one blank line and the
  document ends with exactly one trailing newline.
- Structural, kind-specific validation: `members` is
  required for interfaces and enums and forbidden for
  type aliases and functions; `definition` is required
  for type aliases and `signature` for functions, both
  forbidden elsewhere; member `type` is required for
  interface members and forbidden for enum members;
  `optional` is forbidden on enum members. A present
  forbidden field is an error. Path-naming validation
  errors, duplicate type and member name errors, and
  no partial results on invalid input.
- Counts report the declarations supplied, one tally
  per kind, and the total member count across
  interfaces and enums.
