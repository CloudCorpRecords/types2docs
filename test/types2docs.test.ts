import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderApiReference } from "../src/types2docs.js";

/**
 * All tests are pure local computation over inline type
 * declaration facts: no filesystem, no network. Exact
 * full-document markdown strings are pinned for every
 * kind (with and without docs, member docs, empty
 * members, enum values present and absent, custom and
 * default titles, an empty-string doc paragraph, an
 * empty-string title, and trailing-newline exactness),
 * the counts shape and key order are pinned, and every
 * kind-specific structural validation path — each
 * required and each forbidden field per kind, at both
 * the declaration and the member level — is pinned with
 * its exact path-naming message.
 */

type R = Record<string, unknown>;

const render = (types: unknown, over: R = {}) =>
  renderApiReference({ types, ...over });

const md = (types: unknown, over: R = {}) => render(types, over).markdown;

const iface = (over: R = {}): R => ({
  name: "Widget",
  kind: "interface",
  members: [{ name: "id", type: "string" }],
  ...over,
});

const enm = (over: R = {}): R => ({
  name: "Colour",
  kind: "enum",
  members: [{ name: "Red" }],
  ...over,
});

describe("renderApiReference — exact rendering per kind", () => {
  it("interface: table, Required yes/no from optional, member-doc lines as their own paragraph", () => {
    const out = md([
      {
        name: "Widget",
        kind: "interface",
        doc: "A widget.",
        members: [
          { name: "id", type: "string", doc: "Unique identifier." },
          { name: "label", type: "string", optional: true },
          { name: "count", type: "number", optional: false },
        ],
      },
    ]);
    assert.equal(
      out,
      "# API Reference\n\n## Widget\n\nA widget.\n\nKind: interface\n\n" +
        "| Member | Type | Required |\n| --- | --- | --- |\n" +
        "| id | string | yes |\n| label | string | no |\n| count | number | yes |\n\n" +
        "- `id` — Unique identifier.\n",
    );
  });

  it("interface: no member docs means no member-doc paragraph follows the table", () => {
    const out = md([
      iface({
        members: [
          { name: "a", type: "string" },
          { name: "b", type: "number", optional: true },
        ],
      }),
    ]);
    assert.equal(
      out,
      "# API Reference\n\n## Widget\n\nKind: interface\n\n" +
        "| Member | Type | Required |\n| --- | --- | --- |\n" +
        "| a | string | yes |\n| b | number | no |\n",
    );
  });

  it("interface: member-doc lines follow supplied order and skip undocumented members", () => {
    const out = md([
      iface({
        members: [
          { name: "z", type: "string", doc: "last letter, first row" },
          { name: "a", type: "string" },
          { name: "m", type: "string", doc: "middle doc" },
        ],
      }),
    ]);
    assert.equal(
      out,
      "# API Reference\n\n## Widget\n\nKind: interface\n\n" +
        "| Member | Type | Required |\n| --- | --- | --- |\n" +
        "| z | string | yes |\n| a | string | yes |\n| m | string | yes |\n\n" +
        "- `z` — last letter, first row\n- `m` — middle doc\n",
    );
  });

  it("interface: an empty members array renders (no members) instead of a table", () => {
    assert.equal(
      md([iface({ members: [] })]),
      "# API Reference\n\n## Widget\n\nKind: interface\n\n(no members)\n",
    );
  });

  it("interface: a member type may be an empty string and renders verbatim", () => {
    assert.equal(
      md([iface({ members: [{ name: "a", type: "" }] })]),
      "# API Reference\n\n## Widget\n\nKind: interface\n\n" +
        "| Member | Type | Required |\n| --- | --- | --- |\n| a |  | yes |\n",
    );
  });

  it("type: fenced block with 'type <name> = <definition>', doc as its own paragraph", () => {
    const out = md([
      {
        name: "WidgetId",
        kind: "type",
        doc: "Branded id.",
        definition: 'string & { readonly brand: "WidgetId" }',
      },
    ]);
    assert.equal(
      out,
      "# API Reference\n\n## WidgetId\n\nBranded id.\n\nKind: type\n\n" +
        '```ts\ntype WidgetId = string & { readonly brand: "WidgetId" }\n```\n',
    );
  });

  it("type: an empty-string definition is allowed and renders verbatim", () => {
    assert.equal(
      md([{ name: "E", kind: "type", definition: "" }]),
      "# API Reference\n\n## E\n\nKind: type\n\n```ts\ntype E = \n```\n",
    );
  });

  it("enum: values render with ' = value', docs append with ' — doc'", () => {
    const out = md([
      {
        name: "Colour",
        kind: "enum",
        members: [
          { name: "Red", value: '"red"' },
          { name: "Blue", value: '"blue"', doc: "The calm one." },
          { name: "Green" },
        ],
      },
    ]);
    assert.equal(
      out,
      "# API Reference\n\n## Colour\n\nKind: enum\n\n" +
        '- `Red` = "red"\n- `Blue` = "blue" — The calm one.\n- `Green`\n',
    );
  });

  it("enum: members without values render as bare lines, doc still appended", () => {
    const out = md([
      enm({
        members: [{ name: "Up" }, { name: "Down", doc: "The other way." }],
      }),
    ]);
    assert.equal(
      out,
      "# API Reference\n\n## Colour\n\nKind: enum\n\n- `Up`\n- `Down` — The other way.\n",
    );
  });

  it("enum: an empty-string value still counts as present", () => {
    assert.equal(
      md([enm({ members: [{ name: "Blank", value: "" }] })]),
      "# API Reference\n\n## Colour\n\nKind: enum\n\n- `Blank` = \n",
    );
  });

  it("enum: an empty members array renders (no members)", () => {
    assert.equal(
      md([enm({ members: [] })]),
      "# API Reference\n\n## Colour\n\nKind: enum\n\n(no members)\n",
    );
  });

  it("function: fenced block with the signature verbatim", () => {
    const out = md([
      {
        name: "makeWidget",
        kind: "function",
        doc: "Build one.",
        signature: "function makeWidget(id: WidgetId): Widget",
      },
    ]);
    assert.equal(
      out,
      "# API Reference\n\n## makeWidget\n\nBuild one.\n\nKind: function\n\n" +
        "```ts\nfunction makeWidget(id: WidgetId): Widget\n```\n",
    );
  });

  it("function: an empty-string signature is allowed and renders verbatim", () => {
    assert.equal(
      md([{ name: "noop", kind: "function", signature: "" }]),
      "# API Reference\n\n## noop\n\nKind: function\n\n```ts\n\n```\n",
    );
  });

  it("function: a multi-line signature is emitted verbatim inside the fence", () => {
    const signature = "function f(\n  a: string,\n): void";
    assert.equal(
      md([{ name: "f", kind: "function", signature }]),
      "# API Reference\n\n## f\n\nKind: function\n\n```ts\n" + signature + "\n```\n",
    );
  });
});

describe("renderApiReference — document framing", () => {
  it("default title is 'API Reference'", () => {
    assert.ok(md([iface()]).startsWith("# API Reference\n\n## Widget\n"));
  });

  it("custom title replaces the default on the first line", () => {
    assert.equal(
      md([iface()], { title: "Widget API" }),
      "# Widget API\n\n## Widget\n\nKind: interface\n\n" +
        "| Member | Type | Required |\n| --- | --- | --- |\n| id | string | yes |\n",
    );
  });

  it("an empty-string title is allowed and renders as '# '", () => {
    assert.equal(
      md([{ name: "Only", kind: "type", definition: "number" }], { title: "" }),
      "# \n\n## Only\n\nKind: type\n\n```ts\ntype Only = number\n```\n",
    );
  });

  it("an empty-string doc yields an empty paragraph, still blank-line separated", () => {
    assert.equal(
      md([{ name: "Empty", kind: "interface", doc: "", members: [] }]),
      "# API Reference\n\n## Empty\n\n\n\nKind: interface\n\n(no members)\n",
    );
  });

  it("sections appear in input order, joined by exactly one blank line, one trailing newline", () => {
    const out = md(
      [
        {
          name: "Widget",
          kind: "interface",
          doc: "A widget in the catalogue.",
          members: [
            { name: "id", type: "string", doc: "Unique identifier." },
            { name: "label", type: "string", optional: true },
          ],
        },
        {
          name: "WidgetId",
          kind: "type",
          definition: 'string & { readonly brand: "WidgetId" }',
        },
        {
          name: "Colour",
          kind: "enum",
          members: [
            { name: "Red", value: '"red"' },
            { name: "Blue", value: '"blue"', doc: "The calm one." },
          ],
        },
        {
          name: "makeWidget",
          kind: "function",
          signature: "function makeWidget(id: WidgetId): Widget",
        },
      ],
      { title: "Widget API" },
    );
    assert.equal(
      out,
      "# Widget API\n\n## Widget\n\nA widget in the catalogue.\n\nKind: interface\n\n" +
        "| Member | Type | Required |\n| --- | --- | --- |\n" +
        "| id | string | yes |\n| label | string | no |\n\n" +
        "- `id` — Unique identifier.\n\n" +
        "## WidgetId\n\nKind: type\n\n" +
        '```ts\ntype WidgetId = string & { readonly brand: "WidgetId" }\n```\n\n' +
        "## Colour\n\nKind: enum\n\n" +
        '- `Red` = "red"\n- `Blue` = "blue" — The calm one.\n\n' +
        "## makeWidget\n\nKind: function\n\n" +
        "```ts\nfunction makeWidget(id: WidgetId): Widget\n```\n",
    );
  });

  it("the document ends with exactly one trailing newline and no trailing blank lines", () => {
    for (const types of [
      [iface()],
      [enm()],
      [{ name: "T", kind: "type", definition: "x" }],
      [{ name: "f", kind: "function", signature: "f()" }],
      [iface({ doc: "" })],
    ]) {
      const out = md(types);
      assert.ok(out.endsWith("\n"));
      assert.ok(!out.endsWith("\n\n"));
      assert.ok(!out.includes("\n\n\n\n\n"));
    }
  });

  it("input strings are emitted verbatim, including markdown and spacing", () => {
    const out = md([
      {
        name: "Weird  Name",
        kind: "interface",
        doc: "**bold** | pipes |  and  double  spaces",
        members: [{ name: "a b", type: "Map<string,  number>" }],
      },
    ]);
    assert.equal(
      out,
      "# API Reference\n\n## Weird  Name\n\n**bold** | pipes |  and  double  spaces\n\n" +
        "Kind: interface\n\n| Member | Type | Required |\n| --- | --- | --- |\n" +
        "| a b | Map<string,  number> | yes |\n",
    );
  });
});

describe("renderApiReference — counts", () => {
  it("counts tally each kind and total members across interfaces and enums, keys in pinned order", () => {
    const out = render([
      iface({
        members: [
          { name: "a", type: "string" },
          { name: "b", type: "string" },
        ],
      }),
      { name: "Alias", kind: "type", definition: "string" },
      enm({
        members: [{ name: "X" }, { name: "Y" }, { name: "Z" }],
      }),
      { name: "fn", kind: "function", signature: "fn(): void" },
      iface({ name: "Second", members: [] }),
    ]);
    assert.deepEqual(out.counts, {
      types: 5,
      interfaces: 2,
      type_aliases: 1,
      enums: 1,
      functions: 1,
      members: 5,
    });
    assert.deepEqual(Object.keys(out.counts), [
      "types",
      "interfaces",
      "type_aliases",
      "enums",
      "functions",
      "members",
    ]);
    assert.deepEqual(Object.keys(out), ["markdown", "counts"]);
  });

  it("a single declaration gives counts with zeroes for the other kinds", () => {
    assert.deepEqual(render([enm()]).counts, {
      types: 1,
      interfaces: 0,
      type_aliases: 0,
      enums: 1,
      functions: 0,
      members: 1,
    });
  });
});

describe("renderApiReference — duplicates", () => {
  it("duplicate type names are an error naming the duplicated name", () => {
    assert.throws(() => render([iface(), iface({ kind: "interface" })]), {
      message: "duplicate type name: Widget",
    });
    assert.throws(
      () =>
        render([
          { name: "Same", kind: "type", definition: "a" },
          { name: "Other", kind: "type", definition: "b" },
          { name: "Same", kind: "type", definition: "c" },
        ]),
      { message: "duplicate type name: Same" },
    );
  });

  it("duplicate member names within one interface are an error naming the path", () => {
    assert.throws(
      () =>
        render([
          iface({
            members: [
              { name: "id", type: "string" },
              { name: "id", type: "number" },
            ],
          }),
        ]),
      {
        message:
          "types[0].members[1].name is a duplicate member name: id",
      },
    );
  });

  it("duplicate member names within one enum are an error naming the path", () => {
    assert.throws(
      () =>
        render([
          iface(),
          enm({ members: [{ name: "A" }, { name: "B" }, { name: "A" }] }),
        ]),
      {
        message:
          "types[1].members[2].name is a duplicate member name: A",
      },
    );
  });

  it("the same member name in different declarations is not an error", () => {
    const out = render([
      iface({ members: [{ name: "id", type: "string" }] }),
      iface({ name: "Other", members: [{ name: "id", type: "number" }] }),
      enm({ members: [{ name: "id" }] }),
    ]);
    assert.equal(out.counts.types, 3);
    assert.equal(out.counts.members, 3);
  });

  it("type names differing only by case are distinct", () => {
    const out = render([
      { name: "widget", kind: "type", definition: "a" },
      { name: "Widget", kind: "type", definition: "b" },
    ]);
    assert.equal(out.counts.types, 2);
  });
});

describe("renderApiReference — validation: top level and declaration fields", () => {
  const throws = (args: unknown, message: string) =>
    assert.throws(() => renderApiReference(args), { message });

  it("types missing is an error naming types", () => {
    throws({}, "types is required");
    throws({ title: "X" }, "types is required");
  });

  it("a non-object top-level argument is treated as {} and fails on types", () => {
    throws(null, "types is required");
    throws([], "types is required");
    throws("x", "types is required");
    throws(42, "types is required");
    throws(undefined, "types is required");
  });

  it("types not an array or empty names types", () => {
    throws({ types: "x" }, "types must be a non-empty array");
    throws({ types: {} }, "types must be a non-empty array");
    throws({ types: 3 }, "types must be a non-empty array");
    throws({ types: [] }, "types must be a non-empty array");
  });

  it("title present but not a string names title", () => {
    for (const bad of [42, true, null, [], {}]) {
      throws({ types: [iface()], title: bad }, "title must be a string");
    }
  });

  it("an item that is not an object names its index", () => {
    throws({ types: ["x"] }, "types[0] must be an object");
    throws({ types: [null] }, "types[0] must be an object");
    throws({ types: [[]] }, "types[0] must be an object");
    throws({ types: [iface(), 7] }, "types[1] must be an object");
  });

  it("name missing, empty, or non-string names types[i].name", () => {
    const { name: _n, ...noName } = iface();
    throws({ types: [noName] }, "types[0].name is required");
    throws({ types: [iface({ name: "" })] }, "types[0].name must be a non-empty string");
    throws({ types: [iface({ name: 42 })] }, "types[0].name must be a non-empty string");
    throws(
      { types: [iface(), iface({ name: null })] },
      "types[1].name must be a non-empty string",
    );
  });

  it("kind missing names types[i].kind as required", () => {
    const { kind: _k, ...noKind } = iface();
    throws({ types: [noKind] }, "types[0].kind is required");
  });

  it("kind outside the pinned four names types[i].kind", () => {
    for (const bad of ["class", "Interface", "", 42, true, null, [], {}]) {
      throws(
        { types: [iface({ kind: bad })] },
        'types[0].kind must be one of "interface", "type", "enum", "function"',
      );
    }
  });

  it("doc present but not a string names types[i].doc", () => {
    for (const bad of [42, true, null, [], {}]) {
      throws({ types: [iface({ doc: bad })] }, "types[0].doc must be a string");
    }
  });

  it("unknown extra fields are ignored, including inside items and members", () => {
    const out = renderApiReference({
      types: [
        iface({
          extra: "ignored",
          members: [{ name: "id", type: "string", bogus: 1 }],
        }),
      ],
      generated_by: "test",
    });
    assert.equal(out.counts.types, 1);
    assert.ok(out.markdown.includes("| id | string | yes |"));
  });

  it("no partial result is produced on invalid input deep in the list", () => {
    assert.throws(() =>
      render([iface(), enm(), { name: "Bad", kind: "type" }]),
    );
  });
});

describe("renderApiReference — validation: interface rules", () => {
  const throws = (item: unknown, message: string) =>
    assert.throws(() => render([item]), { message });

  it("members missing for an interface names types[i].members as required", () => {
    const { members: _m, ...noMembers } = iface();
    throws(noMembers, "types[0].members is required for interface");
  });

  it("members not an array for an interface names types[i].members", () => {
    throws(iface({ members: "x" }), "types[0].members must be an array");
    throws(iface({ members: {} }), "types[0].members must be an array");
    throws(iface({ members: 3 }), "types[0].members must be an array");
  });

  it("definition present on an interface is forbidden", () => {
    throws(
      iface({ definition: "string" }),
      "types[0].definition is forbidden for interface",
    );
  });

  it("signature present on an interface is forbidden", () => {
    throws(
      iface({ signature: "f()" }),
      "types[0].signature is forbidden for interface",
    );
  });

  it("a member that is not an object names its path", () => {
    throws(iface({ members: ["x"] }), "types[0].members[0] must be an object");
    throws(iface({ members: [null] }), "types[0].members[0] must be an object");
    throws(
      iface({ members: [{ name: "a", type: "string" }, []] }),
      "types[0].members[1] must be an object",
    );
  });

  it("member name missing, empty, or non-string names the member path", () => {
    throws(
      iface({ members: [{ type: "string" }] }),
      "types[0].members[0].name is required",
    );
    throws(
      iface({ members: [{ name: "", type: "string" }] }),
      "types[0].members[0].name must be a non-empty string",
    );
    throws(
      iface({ members: [{ name: 9, type: "string" }] }),
      "types[0].members[0].name must be a non-empty string",
    );
  });

  it("member type missing for an interface member (the spec's example path)", () => {
    assert.throws(
      () =>
        renderApiReference({
          types: [
            { name: "Ok", kind: "type", definition: "string" },
            { name: "Bad", kind: "interface", members: [{ name: "x" }] },
          ],
        }),
      { message: "types[1].members[0].type is required for interface members" },
    );
  });

  it("member type present but not a string names the member path", () => {
    for (const bad of [42, true, null, [], {}]) {
      throws(
        iface({ members: [{ name: "a", type: bad }] }),
        "types[0].members[0].type must be a string",
      );
    }
  });

  it("member value present on an interface member is forbidden", () => {
    throws(
      iface({ members: [{ name: "a", type: "string", value: "1" }] }),
      "types[0].members[0].value is forbidden for interface members",
    );
  });

  it("member optional present but not a boolean names the member path", () => {
    for (const bad of ["true", 0, 1, null, [], {}]) {
      throws(
        iface({ members: [{ name: "a", type: "string", optional: bad }] }),
        "types[0].members[0].optional must be a boolean",
      );
    }
  });

  it("member doc present but not a string names the member path", () => {
    for (const bad of [42, true, null, [], {}]) {
      throws(
        iface({ members: [{ name: "a", type: "string", doc: bad }] }),
        "types[0].members[0].doc must be a string",
      );
    }
  });
});

describe("renderApiReference — validation: enum rules", () => {
  const throws = (item: unknown, message: string) =>
    assert.throws(() => render([item]), { message });

  it("members missing for an enum names types[i].members as required", () => {
    const { members: _m, ...noMembers } = enm();
    throws(noMembers, "types[0].members is required for enum");
  });

  it("members not an array for an enum names types[i].members", () => {
    throws(enm({ members: "x" }), "types[0].members must be an array");
  });

  it("definition present on an enum is forbidden", () => {
    throws(enm({ definition: "x" }), "types[0].definition is forbidden for enum");
  });

  it("signature present on an enum is forbidden", () => {
    throws(enm({ signature: "f()" }), "types[0].signature is forbidden for enum");
  });

  it("member type present on an enum member is forbidden", () => {
    throws(
      enm({ members: [{ name: "A", type: "string" }] }),
      "types[0].members[0].type is forbidden for enum members",
    );
  });

  it("member optional present on an enum member is forbidden, true or false", () => {
    throws(
      enm({ members: [{ name: "A", optional: true }] }),
      "types[0].members[0].optional is forbidden for enum members",
    );
    throws(
      enm({ members: [{ name: "A", optional: false }] }),
      "types[0].members[0].optional is forbidden for enum members",
    );
  });

  it("member value present but not a string names the member path", () => {
    for (const bad of [42, true, null, [], {}]) {
      throws(
        enm({ members: [{ name: "A", value: bad }] }),
        "types[0].members[0].value must be a string",
      );
    }
  });

  it("member name missing on an enum member names the member path", () => {
    throws(enm({ members: [{}] }), "types[0].members[0].name is required");
    throws(
      enm({ members: [{ name: "" }] }),
      "types[0].members[0].name must be a non-empty string",
    );
  });

  it("member doc present but not a string names the member path", () => {
    throws(
      enm({ members: [{ name: "A", doc: 3 }] }),
      "types[0].members[0].doc must be a string",
    );
  });
});

describe("renderApiReference — validation: type alias rules", () => {
  const alias = (over: R = {}): R => ({
    name: "Alias",
    kind: "type",
    definition: "string",
    ...over,
  });
  const throws = (item: unknown, message: string) =>
    assert.throws(() => render([item]), { message });

  it("definition missing for a type alias names types[i].definition as required", () => {
    const { definition: _d, ...noDef } = alias();
    throws(noDef, "types[0].definition is required for type");
  });

  it("definition present but not a string names types[i].definition", () => {
    for (const bad of [42, true, null, [], {}]) {
      throws(alias({ definition: bad }), "types[0].definition must be a string");
    }
  });

  it("members present on a type alias is forbidden, even an empty array", () => {
    throws(alias({ members: [] }), "types[0].members is forbidden for type");
    throws(
      alias({ members: [{ name: "a", type: "string" }] }),
      "types[0].members is forbidden for type",
    );
  });

  it("signature present on a type alias is forbidden", () => {
    throws(alias({ signature: "f()" }), "types[0].signature is forbidden for type");
  });
});

describe("renderApiReference — validation: function rules", () => {
  const fn = (over: R = {}): R => ({
    name: "fn",
    kind: "function",
    signature: "fn(): void",
    ...over,
  });
  const throws = (item: unknown, message: string) =>
    assert.throws(() => render([item]), { message });

  it("signature missing for a function names types[i].signature as required", () => {
    const { signature: _s, ...noSig } = fn();
    throws(noSig, "types[0].signature is required for function");
  });

  it("signature present but not a string names types[i].signature", () => {
    for (const bad of [42, true, null, [], {}]) {
      throws(fn({ signature: bad }), "types[0].signature must be a string");
    }
  });

  it("members present on a function is forbidden, even an empty array", () => {
    throws(fn({ members: [] }), "types[0].members is forbidden for function");
  });

  it("definition present on a function is forbidden", () => {
    throws(
      fn({ definition: "string" }),
      "types[0].definition is forbidden for function",
    );
  });
});
