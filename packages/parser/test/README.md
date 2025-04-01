# AIML Parser Guidelines

This document outlines the proper syntax for AIML files to work with the parser.

## Common Issues and Solutions

1. **Array/Object Expressions in Attributes**:

   - ❌ `<data id="order" value={[]} />`
   - ✅ `<data id="order" value="[]" />`

2. **If/Else Structure**:

   - ❌ Nested `<else>` inside `<if>` (invalid):
     ```xml
     <if condition={ctx.lastElement.result === "true"}>
         <transition to="respond" />
         <else>
             <transition to="generateResponse" />
         </else>
     </if>
     ```
   - ✅ Separate `<if>` statements (valid):
     ```xml
     <if condition="true">
         <transition to="respond" />
     </if>
     <if condition="false">
         <transition to="generateResponse" />
     </if>
     ```

3. **ForEach Items Attribute**:

   - ❌ `<forEach items={ctx.lastElement.actions} var="currentAction">`
   - ✅ `<forEach items="items" var="currentAction">`

4. **Complex JavaScript Logic**:

   - ❌ Using complex expressions in attributes
   - ✅ Use the `<script>` tag for complex logic:
     ```xml
     <script>
       // JavaScript code here
       const items = ctx.lastElement.actions || [];
       for (const item of items) {
         // Process items
       }
     </script>
     ```

5. **Quotation Marks in Expressions**:

   - ❌ Using single quotes in expressions `value={'string'}`
   - ✅ Use double quotes for attribute values `value="string"`

6. **JSON in Attributes**:
   - ❌ Complex nested JSON in attributes
   - ✅ Simple string values or use `<script>` for complex objects

## Example of Valid AIML Structure

```xml
<data id="nameForOrder" value="" />
<data id="order" value="[]" />
<data id="actionHistory" value="[]" />

<workflow>
  <state id="generateResponse">
    <llm
        model="gpt-4o"
        prompt="What would you like to order?"
        temperature="0.7"
    />

    <assign id="response" value="Hello, welcome to BurgerByte!" action="append" />
    <assign id="actionHistory" value="Greeting" action="append" />

    <transition to="guardrails" />
  </state>

  <state id="guardrails">
    <llm
        model="gpt-3.5-turbo"
        prompt="Is this valid?"
        temperature="0"
    />

    <transition to="respond" />
  </state>

  <final id="respond" />
</workflow>
```

## Notes on Parser Behavior

1. XML tag syntax (e.g., `<state> ... </state>`) wrapping AIML elements will generate AIML007 warnings, but this is expected behavior and doesn't prevent parsing.

2. The parser uses fuzzy matching to correct mismatched tags, which can result in "Corrected mismatched tag" warnings (AIML011).

3. Complex expressions in attributes should be avoided. Use string literals or move logic to `<script>` tags.
