/**
 * types2docs MCP server. Tools: render_api_reference.
 *
 * Why the low-level Server instead of McpServer: the high-level
 * helper converts zod schemas to JSON Schema and injects keys
 * not in this tool's defined spec ("$schema" and
 * "additionalProperties"), which breaks exact tool-list/schema
 * parity with the spec. This file serves tools/list with the
 * spec's exact input schema as an explicit literal, and every
 * tools/call is validated by the core, which names the
 * offending path on invalid input.
 *
 * The computation is pure and local: no filesystem, no
 * network, and no configuration — the caller supplies
 * every type declaration fact the reference is based on.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { formatPayload, renderApiReference, VERSION } from "./types2docs.js";

const TOOLS = [
  {
    name: "render_api_reference",
    description:
      "Render a markdown API reference from caller-supplied TypeScript type declarations: interfaces, type aliases, enums, and functions, in a pinned deterministic layout. Nothing is invented; every string comes from the input.",
    inputSchema: {
      type: "object" as const,
      properties: {
        types: {
          type: "array",
          description: "Type declarations to document, in document order",
          items: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Declared name",
              },
              kind: {
                type: "string",
                description:
                  "Declaration kind: \"interface\", \"type\", \"enum\", or \"function\"",
              },
              doc: {
                type: "string",
                description: "Doc comment text for the declaration (optional)",
              },
              members: {
                type: "array",
                description:
                  "Members — required for interface and enum, forbidden for type and function (see spec)",
                items: {
                  type: "object",
                  properties: {
                    name: {
                      type: "string",
                      description: "Member name",
                    },
                    type: {
                      type: "string",
                      description: "Member type text (interface members only)",
                    },
                    value: {
                      type: "string",
                      description: "Enum member value text (optional)",
                    },
                    optional: {
                      type: "boolean",
                      description:
                        "Whether the member is optional (interface members only)",
                    },
                    doc: {
                      type: "string",
                      description: "Doc comment text for the member (optional)",
                    },
                  },
                  required: ["name"],
                },
              },
              definition: {
                type: "string",
                description: "The alias's right-hand side, verbatim",
              },
              signature: {
                type: "string",
                description: "The function signature, verbatim",
              },
            },
            required: ["name", "kind"],
          },
        },
        title: {
          type: "string",
          description: "Document title (optional, default \"API Reference\")",
        },
      },
      required: ["types"],
    },
  },
];

function textResult(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: typeof value === "string" ? value : JSON.stringify(value, null, 2),
      },
    ],
  };
}

function errorResult(err: unknown) {
  return {
    content: [
      { type: "text" as const, text: err instanceof Error ? err.message : String(err) },
    ],
    isError: true,
  };
}

const server = new Server(
  { name: "types2docs", version: VERSION },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    let out: unknown;
    if (name === "render_api_reference") {
      out = renderApiReference(args ?? {});
    } else {
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
    return textResult(formatPayload(out));
  } catch (err) {
    if (err instanceof McpError) throw err;
    return errorResult(err);
  }
});

async function main(): Promise<void> {
  await server.connect(new StdioServerTransport());
}

void main();
