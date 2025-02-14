## SCXML Runtime Execution Flow

### SCXML Element

The root SCXML element must contain at least one `<state>`, `<parallel>` or `<final>` child element. The allowed children are:

- `<state>` - Main state containers
- `<parallel>` - Parallel state containers
- `<final>` - Terminal states
- `<datamodel>` - Data declarations
- `<script>` - JavaScript code

At initialization, the SCXML Processor enters states based on the following rules:

1. If an 'initial' attribute is present, enter the specified state(s)
2. If no 'initial' attribute exists, enter the first state in document order

Once the initial state is entered, the state machine's behavior is determined by transitions:

- Without transitions between states, the machine will remain in its initial state indefinitely
- Events will be discarded if no transitions exist to handle them
- The machine can only terminate if a `<final>` state is entered explicitly

### State Element

State elements execute their children in this order:

1. `<onentry>` handlers execute when the state becomes active
2. Child states (`<state>`, `<parallel>`, `<final>`) are initialized
3. `<transition>` elements are evaluated in document order when events occur
4. `<onexit>` handlers execute when transitioning out of the state

The execution flow within a state follows these rules:

- Enter default initial state (via `<initial>` or first child).
- Only one child state can be active at a time (unless in a parallel)
- Transitions are evaluated in order until a matching one is found
- Entry/exit handlers run atomically during state transitions

### Parallel Element

Parallel elements allow multiple child states to be active simultaneously:

1. All child states are initialized and become active
2. Child states execute independently in parallel
3. Transitions in parallel states can fire independently
4. All parallel regions must reach final states to complete

### Final Element

Final elements mark the completion of a state machine or region:

1. `<onentry>` handlers execute
2. The element enters its final configuration
3. No further transitions or child execution occurs

### Action Elements

Action elements provide executable behaviors within states and transitions:

1. `<assign>` - Immediately assigns values to datamodel variables
2. `<log>` - Logs messages for debugging/monitoring
3. `<send>` - Sends events to the event queue
4. `<raise>` - Raises internal events
5. `<if>/<elseif>/<else>` - Conditional execution blocks
6. `<foreach>` - Iterates over arrays/objects

The execution order for control flow actions:

#### If/Elseif/Else

1. Conditions are evaluated in order
2. First matching condition block executes
3. If no conditions match, else block executes if present
4. Only one block executes per if statement

#### Foreach

1. Collection is evaluated once at start
2. Iterator variable is assigned for each item
3. Body executes sequentially for each item
4. Array modifications during iteration don't affect remaining iterations

### Execution Model

The overall execution model follows these principles:

- States maintain active/inactive status in the datamodel
- Transitions evaluate conditions and events to determine when to fire
- Entry/exit handlers provide hooks for side effects
- Parent states coordinate the execution of their children
- The machine runs until reaching a final state or stable configuration
- Action elements execute atomically in document order
- Control flow actions provide structured program flow
- Iterations and conditions maintain lexical scoping

This execution order ensures deterministic behavior while supporting complex state hierarchies, parallel regions, event-driven transitions, and structured control flow.

### Error Handling

1. **Error Events**:
   - `error.execution` (e.g., invalid expressions).
   - `error.communication` (e.g., failed `<send>`).
   - `error.platform` (platform-specific errors).
2. **Error Propagation**:
   - Errors are queued as internal events.
   - Unhandled errors terminate the session if no transitions match.
