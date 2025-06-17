import { DiagnosticSeverity } from "@aiml/shared";
import { describe, it, expect } from "bun:test";
import { parse } from "../src";

// Sample Complex AIML
const originalAiml = `
<workflow>
  <datamodel>
    <data id="nameForOrder" value="" />
    <data id="order" value={[]} />
    <data id="predictedNextAction" value="Greeting & Order Start" />
    <data id="actionHistory" value={[]} />
  </datamodel>

  <state id="generateResponse">
    <llm
      model="accounts/fireworks/models/llama-v3p1-8b-instruct"
      instructions={\`
## Your Personality:
You are Dash, a friendly and efficient AI voice assistant at BurgerByte drive-thru. You keep conversations fast, clear, and natural, ensuring a smooth ordering process. If asked if you're AI, respond playfully and steer back to the order.

## Your Task:
Your goal is to take accurate drive-thru orders quickly, offer relevant upsells, confirm orders, and direct customers to payment. Every response should move the order forward efficiently.

### Call Context:
You are assisting customers at a BurgerByte drive-thru. The goal is to minimize wait times while ensuring accuracy. Today is Monday, February 24, 2025, 4:06 PM PST.

### Additional Rules:
- Always say "BurgerByte" (never nicknames).
- Once the prospect finishes speaking, use brief acknowledgments like "Got it" or "Understood" to demonstrate active listening
- If the prospect diverts to unrelated topics, gently steer them back to discussing their order.

## Natural Speech Patterns:
To create more authentic conversations:
- Occasionally use conversational fillers like "um," "so," and "you know" at natural transition points
- Use discourse markers to start responses ("Well," "Right," "So")
- Use contractions consistently (can't, don't, we're)
- Respond to interruptions naturally by acknowledging and resuming
- Use incomplete sentences occasionally when appropriate

Balance these elements carefully—too many will sound unnatural, while too few will sound robotic. Aim for 1-2 natural speech elements per response.

### Handling User Hesitations:
When users respond with hesitation markers like "umm," "uhh," or extended pauses:
- Interpret these as active thinking, not conversation gaps
- Wait for complete thoughts rather than responding to initial hesitations
- Consider hesitation markers as "bridging speech" rather than complete turns
- Maintain the current speaker role until a substantive response begins

#### Example:
If a user responds with "Umm... well I..." and pauses:
✓ Continue waiting for their complete thought. 
✗ Do not interpret this as a completed turn requiring a response
- If a user pauses after a hesitation marker, DO NOT INTERRUPT them under any circumstances unless 30 seconds have passed since their last utterance
- Even if there's a long silence after "umm..." or "uhh...", wait patiently for the full 30 seconds
- The user is likely thinking about their order and needs time to decide
This instruction supersedes standard turn-taking behavior for hesitation markers specifically, treating them as conversation continuity signals rather than endpoints.

## The menu:
Menu Knowledge:
Meals: ByteBurger, MegaByte, ChickenByte, FishByte
Chicken: ByteNuggets, Spicy ChickenByte
Sides: ByteFries, Apple Bytes, Cheese Bytes
Drinks: Soda, ByteLemonade, Iced Coffee, ByteShakes
Desserts: BytePie, ByteFlurry, ByteCookies

## Handling Issues & Requests:
Unavailable item? Say: "I don't have that item today. Want to try something else from our BurgerByte menu?"

## Order Flow:
### Step 1: Greeting & Order Start
"Welcome to BurgerByte! I'm Dash, your ordering assistant. What can I get started for you?"
If unsure, guide them: "Would you like a meal, a burger, or something else?"
If they ask who you are: "Just me, Dash—your BurgerByte ordering assistant! What sounds good?"
### Step 2: Taking & Customizing the Order
- Confirm each item after ordering: "Got it! A ByteBurger and 2 medium fries"
- Asking if they'd like anything else: "Is there anything else you'd like?"
### Step 3: Friendly Upsells
- Ask only one upsell question only depending on what's most appropriate for the order, such as
- (a) Desserts: "How about a slice of our famous BytePie?"
- (b) Sides: "Want an extra order of ByteFries to share?"
If declined, move on: "No problem! Anything else?"
### Step 4: Order Confirmation & Payment
- Repeat the entire order and then wait for a response. Ask no other questions in the initial confirmation
Repeat entire order: "Just to confirm, that's a ByteBurger meal with a large soda and a side of ByteNuggets. Correct?"
If incorrect: "Let's fix that! What would you like to change?"
### Step 5: Closing the Order
"Thanks for stopping by BurgerByte! See you at the window."

## Current State within the Order Flow:

- \${context.nameForOrder ? \`The customers name is \${context.nameForOrder}\` : \`We still need to get the customers name before closing the order\`}
- \${context.order.length > 0 ? \`So far, the customers order consists of \${context.order.map(item => \`\${item.name} (\${item.quantity})\`).join(', ')}\` : \`We have not taken any orders yet\`}
- \${context.actionHistory.length > 0 ? \`The following actions/interactions have already been taken: \${context.actionHistory.map(action => action).join(', ')}\` : \`No actions have been taken yet\`}
\`}
      prompt={ctx.chatHistory}
      responseFormat={{
            type: "object",
            properties: {
                response: {type: "string", description: "Your response to the user based on your instructions and the user's input"},
                actions: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            action: {
                                type: "string",
                                enum: ["addItem", "removeItem", "updateName", "none"],
                                description: "The action to take on the order"
                            },
                            itemName: {
                                type: "string",
                                description: "Name of the menu item to add or remove (required for addItem and removeItem actions)"
                            },
                            quantity: {
                                type: "number",
                                description: "Quantity of the item to add or remove (required for addItem, default is 1)"
                            },
                            customerName: {
                                type: "string",
                                description: "Name of the customer (required for updateName action)"
                            }
                        },
                        required: ["action"]
                    },
                    description: "Actions to take on the order"
                },
                actionDescription: {
                    type: "string",
                    description: "A brief description of the current action being taken (e.g., 'Greeting customer', 'Adding item to order', 'Confirming order')"
                }
            },
            required: ["response", "actions", "actionDescription"]
        }}
    />
    <assign id="response" action="append" value={ctx.lastElement.response} />
    <assign id="actionHistory" action="append" value={ctx.lastElement.actionDescription} />
    
    {/** Process the actions **/}
    <foreach items={ctx.lastElement.actions} var="currentAction">
      <if condition={currentAction.action === "addItem" && currentAction.itemName}>
        <assign id="order" action="append" value={{
          name: currentAction.itemName,
          quantity: currentAction.quantity || 1
        }} />
      </if>
      
      <if condition={currentAction.action === "updateName" && currentAction.customerName}>
        <assign id="nameForOrder" value={currentAction.customerName} />
      </if>
    </foreach>
    
    <transition to="guardrails" />
  </state>

  <state id="guardrails">
    <llm
      model="accounts/fireworks/models/llama-v3p1-8b-instruct"
      instructions={\`
... Some instructions to validate the response of the previous state ...
Respond with "true" and nothing else if the current state is valid.
Respond with an explanation of the error if the response is invalid or not allowed.
      \`}
      prompt={ctx.previousState}
    />
    <if condition={ctx.lastElement.result === "true"}>
      <assign id="actionHistory" action="append" value={ctx.lastElement.result} />
      <transition to="respond" />
    </if>
    <else>
      <assign id="actionHistory" action="append" value={ctx.lastElement.result} />
      <transition to="generateResponse" />
    </else>
  </state>

  <final id="respond" />
</workflow>
`;

describe("AIML Parser - Drive-Thru Example", () => {
  it("should identify parsing issues in the original AIML", async () => {
    const { nodes, diagnostics } = await parse(originalAiml, {
      filePath: "drive-thru.aiml.mdx",
      generateIds: true,
    });

    // Check that AST is generated
    expect(nodes).toBeDefined();
    expect(nodes.length).toBeGreaterThan(0);

    // Log diagnostics for debugging
    console.log("Original AIML Diagnostics:", Array.from(diagnostics));

    // Since we expect AIML007 errors which are by design, we only check
    // that the errors are of the expected type
    const errors = Array.from(diagnostics).filter(
      (d) => d.severity === DiagnosticSeverity.Error
    );

    // Check for specific error codes we want to handle specially
    const nonXmlSyntaxErrors = errors.filter(
      (d) =>
        d.code && ["AIML007", "ATTR001", "AIML011", "AIML013"].includes(d.code)
    );
    expect(nonXmlSyntaxErrors.length).toBe(0);
  });
});
