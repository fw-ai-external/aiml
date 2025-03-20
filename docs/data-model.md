# Data Model System

The data model system provides a way to define, validate, and access data in AIML workflows. It consists of several components that work together to provide a robust and type-safe way to manage data.

## Components

### DataElement

The `DataElement` is used to define a single piece of data in the datamodel. It has the following attributes:

- `id` (required): The identifier for the data element.
- `expr` (optional): An expression to evaluate to get the value.
- `type` (optional, default: "string"): The type of the data element. Can be "string", "number", "boolean", or "json".
- `readonly` (optional, default: false): Whether the data element can be modified.
- `fromRequest` (optional, default: false): Whether the data element gets its value from the user's request. If true, the element is automatically readonly.
- `defaultValue` (optional): A default value to use if the expression evaluation fails.
- `schema` (optional): A JSONSchema object for complex data validation.

Example:

```jsx
<data id="username" type="string" fromRequest={true} />
<data id="count" type="number" expr="0" />
<data id="isAdmin" type="boolean" expr="false" readonly={true} />
```

### DataModelElement

The `DataModelElement` is a container for data elements. It initializes and validates the data elements.

Example:

```jsx
<datamodel>
  <data id="username" type="string" fromRequest={true} />
  <data id="count" type="number" expr="0" />
  <data id="isAdmin" type="boolean" expr="false" readonly={true} />
</datamodel>
```

### AssignElement

The `AssignElement` is used to update values in the datamodel. It has the following attributes:

- `location` (required): The ID of the data element to update.
- `expr` (optional): An expression to evaluate to get the new value.

Example:

```jsx
<assign location="count" expr="count + 1" />
```

## Scoping

Data elements are scoped based on the document hierarchy. A data element is accessible from its parent state and all descendant states, but not from sibling states or ancestor states.

For example:

```jsx
<workflow>
  <datamodel>
    <data id="globalVar" expr="'global'" />
  </datamodel>

  <state id="state1">
    <datamodel>
      <data id="state1Var" expr="'state1'" />
    </datamodel>

    <state id="state1Child">
      <datamodel>
        <data id="state1ChildVar" expr="'state1Child'" />
      </datamodel>

      <!-- Can access globalVar, state1Var, and state1ChildVar -->
      <assign location="state1Var" expr="'new value'" />
    </state>
  </state>

  <state id="state2">
    <datamodel>
      <data id="state2Var" expr="'state2'" />
    </datamodel>

    <!-- Can access globalVar and state2Var, but not state1Var or state1ChildVar -->
    <assign location="globalVar" expr="'new global'" />
  </state>
</workflow>
```

## Type Validation

The data model system validates values against their declared types. If a value doesn't match the declared type, an error is thrown.

For example:

```jsx
<datamodel>
  <data id="count" type="number" expr="0" />
</datamodel>

<!-- This will throw an error because "not a number" is not a number -->
<assign location="count" expr="'not a number'" />
```

## Readonly Properties

Data elements can be marked as readonly, which prevents them from being modified. If an attempt is made to modify a readonly data element, an error is thrown.

For example:

```jsx
<datamodel>
  <data id="username" type="string" fromRequest={true} />
  <data id="isAdmin" type="boolean" expr="false" readonly={true} />
</datamodel>

<!-- This will throw an error because username is readonly (fromRequest=true) -->
<assign location="username" expr="'new username'" />

<!-- This will throw an error because isAdmin is readonly -->
<assign location="isAdmin" expr="true" />
```

## Request Values

Data elements can get their values from the user's request using the `fromRequest` attribute. These elements are automatically readonly.

For example:

```jsx
<datamodel>
  <data id="userMessage" type="string" fromRequest={true} />
</datamodel>

<!-- userMessage will contain the user's message -->
<llm prompt={`You said: ${userMessage}`} />
```

## Error Handling

The data model system provides detailed error messages for various error conditions:

- Missing required attributes (e.g., `id` for data elements, `location` for assign elements)
- Type validation errors (e.g., assigning a string to a number)
- Readonly violations (e.g., attempting to modify a readonly data element)
- Scope violations (e.g., attempting to access a variable from an out-of-scope state)

These errors are returned as `StepValue` objects with `type: "error"` and a descriptive error message.

## Complex Data Structures with JSONSchema

The data model system supports complex nested data structures through the use of JSONSchema. This allows for more sophisticated validation of data, including nested objects, arrays with specific item types, and constraints on values.

### JSONSchema Structure

The `schema` attribute of a data element can be used to define a JSONSchema for complex data validation. The schema can include the following properties:

- `type`: The type of the data (string, number, boolean, json)
- `properties`: For object types, a record of property names to their schemas
- `items`: For array types, the schema for array items
- `required`: For object types, an array of required property names
- `enum`: An array of allowed values
- `pattern`: For string types, a regex pattern to match
- `minimum` / `maximum`: For number types, the minimum/maximum allowed value
- `minLength` / `maxLength`: For string and array types, the minimum/maximum length

### Examples

#### Object with Required Properties

```jsx
<data
  id="user"
  type="json"
  expr="{}"
  schema={{
    type: ValueType.JSON,
    properties: {
      name: { type: ValueType.STRING },
      age: { type: ValueType.NUMBER, minimum: 0 },
      email: {
        type: ValueType.STRING,
        pattern: "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$",
      },
    },
    required: ["name", "email"],
  }}
/>
```

#### Array of Objects

```jsx
<data
  id="tasks"
  type="json"
  expr="[]"
  schema={{
    type: ValueType.JSON,
    items: {
      type: ValueType.JSON,
      properties: {
        id: { type: ValueType.STRING },
        title: { type: ValueType.STRING },
        completed: { type: ValueType.BOOLEAN },
      },
      required: ["id", "title"],
    },
  }}
/>
```

#### Nested Objects

```jsx
<data
  id="address"
  type="json"
  expr="{}"
  schema={{
    type: ValueType.JSON,
    properties: {
      street: { type: ValueType.STRING },
      city: { type: ValueType.STRING },
      state: { type: ValueType.STRING },
      zip: { type: ValueType.STRING },
      country: { type: ValueType.STRING },
      coordinates: {
        type: ValueType.JSON,
        properties: {
          latitude: { type: ValueType.NUMBER },
          longitude: { type: ValueType.NUMBER },
        },
        required: ["latitude", "longitude"],
      },
    },
    required: ["street", "city", "state", "zip"],
  }}
/>
```

#### Enum Values

```jsx
<data
  id="status"
  type="string"
  expr="'pending'"
  schema={{
    type: ValueType.STRING,
    enum: ["pending", "in-progress", "completed", "cancelled"],
  }}
/>
```

### Validation

When a value is assigned to a data element with a schema, the value is validated against the schema. If the value doesn't match the schema, an error is thrown.

```jsx
<datamodel>
  <data
    id="user"
    type="json"
    expr="{}"
    schema={{
      type: ValueType.JSON,
      properties: {
        name: { type: ValueType.STRING },
        age: { type: ValueType.NUMBER, minimum: 0 }
      },
      required: ["name"]
    }}
  />
</datamodel>

<!-- This will throw an error because age is negative -->
<assign location="user" expr="{ name: 'John', age: -5 }" />

<!-- This will throw an error because name is required -->
<assign location="user" expr="{ age: 30 }" />
```

## Implementation Details

### ScopedDataModel

The `ScopedDataModel` is a class that provides scoped access to the datamodel. It has methods for getting and setting values, checking if variables are accessible, and managing metadata.

### ElementExecutionContext

The `ElementExecutionContext` is a class that provides the execution context for elements. It includes a datamodel proxy that enforces scoping rules and readonly properties.

### Parser Validation

The parser validates assign elements against the datamodel and provides diagnostics for type mismatches and scope violations. This helps catch errors early, before the workflow is executed.
