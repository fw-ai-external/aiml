import { describe, expect, test } from "bun:test";
import { extractTemplateSchemaFromString } from "./strings";

// TODO not yet working
describe.skip("extractTemplateSchemaFromString", () => {
  test("should extract template schema from string with input", async () => {
    const template = "Hello, ${input.name}!";
    const schema = await extractTemplateSchemaFromString(template);
    expect(schema).toEqual({
      input: {
        type: "object",
        properties: {
          name: { type: "string" },
        },
      },
      inputs: {
        type: "object",
        properties: {},
        required: [],
      },
      context: {
        type: "object",
        properties: {},
        required: [],
      },
    });
  }, 10_000);

  test("should handle nested properties for inputs", async () => {
    const template = "Hello, ${inputs.user.profile.firstName}!";
    const schema = await extractTemplateSchemaFromString(template);
    console.log("schema", JSON.stringify(schema, null, 2));
    expect(schema).toEqual({
      inputs: {
        type: "object",
        properties: {
          user: {
            type: "object",
            properties: {
              profile: {
                type: "object",
                properties: {
                  firstName: { type: "string" },
                },
              },
            },
          },
        },
      },
      context: {
        type: "object",
        properties: {},
        required: [],
      },
      input: {
        type: "object",
        properties: {},
        required: [],
      },
    });
  }, 10_000);

  test("should handle context variable", async () => {
    const template = "Current user: ${context.currentUser}";
    const schema = await extractTemplateSchemaFromString(template);
    expect(schema).toEqual({
      context: {
        type: "object",
        properties: {
          currentUser: { type: "string" },
        },
        required: ["currentUser"],
      },
      input: {
        type: "object",
        properties: {},
        required: [],
      },
      inputs: {
        type: "object",
        properties: {},
        required: [],
      },
    });
  }, 10_000);

  test("should not throw error for invalid top-level variable", async () => {
    const template = "Hello, ${user.profile.firstName}!";
    const schema = await extractTemplateSchemaFromString(template);
    expect(schema).toEqual({});
  }, 10_000);

  test("should handle multiple variables in one template", async () => {
    const template =
      "Hello, ${input.name}! Your score is ${inputs.game.score} and the date is ${context.currentDate}.";
    const schema = await extractTemplateSchemaFromString(template);
    expect(schema).toEqual({
      input: {
        type: "object",
        properties: {
          name: { type: "string" },
        },
      },
      inputs: {
        type: "object",
        properties: {
          game: {
            type: "object",
            properties: {
              score: { type: "number" },
            },
          },
        },
      },
      context: {
        type: "object",
        properties: {
          currentDate: { type: "string" },
        },
      },
    });
  }, 10_000);

  test("should handle Object.keys expression", async () => {
    const template = "Keys: ${Object.keys(inputs)}";
    const schema = await extractTemplateSchemaFromString(template);
    expect(schema).toEqual({
      inputs: { type: "object" },
    });
  }, 10_000);

  test("should handle complex conditional expression", async () => {
    const template =
      '${Array.isArray(inputs) ? inputs.map(i => i.text) : "foo" in inputs ? inputs.foo : input}';
    const schema = await extractTemplateSchemaFromString(template);
    expect(schema).toEqual({
      inputs: {
        oneOf: [
          {
            type: "array",
            items: {
              type: "object",
              properties: {
                text: {
                  type: "string",
                },
              },
              required: ["text"],
            },
          },
          {
            type: "object",
            properties: {
              foo: {
                type: "string",
              },
            },
          },
        ],
      },
      input: {
        type: "object",
      },
    });
  }, 10_000);

  test("should handle nested object properties in complex expressions", async () => {
    const template =
      "${inputs.users.filter(user => user.age > 18).map(user => user.name)}";
    const schema = await extractTemplateSchemaFromString(template);
    expect(schema).toEqual({
      inputs: {
        type: "object",
        properties: {
          users: {
            type: "array",
            items: { type: "object", properties: { name: { type: "string" } } },
          },
        },
      },
      context: {},
      input: {},
    });
  }, 10_000);

  test("should handle multiple complex expressions in one template", async () => {
    const template = `
      Users: \${Object.keys(inputs.users)}
      Adult names: \${inputs.users.filter((user) => user.age >= 18).map((user) => user.name)}
      Context: \${context.currentUser ? context.currentUser.name : 'Guest'}
    `;
    const schema = await extractTemplateSchemaFromString(template);
    expect(schema).toEqual({
      inputs: {
        type: "object",
        properties: {
          users: {
            type: "array",
            items: { type: "object", properties: { name: { type: "string" } } },
          },
        },
      },
      context: {
        type: "object",
        properties: {
          currentUser: {
            type: "object",
            properties: { name: { type: "string" } },
          },
        },
      },
    });
  });
});
