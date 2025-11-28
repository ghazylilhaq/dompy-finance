# Feature 0020: Dompy Assistant - AI Chat Interface with Tool Calling

## Context

Dompy Assistant is a ChatGPT-style conversational interface for personal finance management. Users interact via natural language (and images), and the assistant uses **tools** to read data (transactions, budgets, accounts, summaries) and propose changes (new transactions, updated budgets, new categories). Read tools execute automatically; write tools generate **proposals** shown as UI cards that require user confirmation before database modification.

The user experience goal: "I just talk to it. It figures out what to do, shows me the plan, and I approve or adjust."

---

## Data Layer

### New Database Tables

#### 1. `conversations` Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique conversation identifier |
| `user_id` | VARCHAR | NOT NULL, FK | Clerk user ID |
| `title` | VARCHAR(255) | | Auto-generated or user-set title |
| `created_at` | TIMESTAMP | NOT NULL | Creation timestamp |
| `updated_at` | TIMESTAMP | NOT NULL | Last activity timestamp |

#### 2. `conversation_messages` Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique message identifier |
| `conversation_id` | UUID | NOT NULL, FK | Parent conversation |
| `role` | VARCHAR(20) | NOT NULL | `user`, `assistant`, `system`, `tool` |
| `content` | TEXT | | Message text content |
| `image_url` | TEXT | | Optional image attachment URL |
| `tool_calls` | JSONB | | Array of tool calls made (for assistant messages) |
| `tool_call_id` | VARCHAR(100) | | Tool call ID (for tool result messages) |
| `tool_name` | VARCHAR(100) | | Tool name (for tool result messages) |
| `created_at` | TIMESTAMP | NOT NULL | Message timestamp |

#### 3. `action_proposals` Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Proposal identifier |
| `conversation_id` | UUID | NOT NULL, FK | Parent conversation |
| `message_id` | UUID | NOT NULL, FK | Message that created proposal |
| `proposal_type` | VARCHAR(50) | NOT NULL | `transaction`, `budget`, `category`, `transfer` |
| `status` | VARCHAR(20) | NOT NULL | `pending`, `confirmed`, `revised`, `discarded` |
| `original_payload` | JSONB | NOT NULL | Initial payload from tool |
| `revised_payload` | JSONB | | User-modified payload |
| `applied_at` | TIMESTAMP | | When applied to DB |
| `result_id` | UUID | | ID of created/updated entity |
| `created_at` | TIMESTAMP | NOT NULL | Creation timestamp |

### Migration File

- `backend/alembic/versions/YYYYMMDD_HHMMSS_add_assistant_tables.py`

---

## Backend Changes

### New Router: `backend/app/routers/assistant.py`

#### Endpoints

1. **`POST /api/assistant/message`**
   - Input: `{ conversation_id?: string, message: string, image_url?: string }`
   - Process:
     - Create/retrieve conversation
     - Store user message
     - Call LLM with tool definitions + conversation history
     - Execute read tools automatically (loop until no more tool calls)
     - For write tools, generate proposals (do NOT apply)
     - Store assistant message with tool_calls
     - Return: `{ message_id, content, tool_calls, proposals }`

2. **`POST /api/assistant/apply`**
   - Input: `{ proposal_ids: string[], revisions?: Record<string, object> }`
   - Process:
     - Validate proposal ownership and status
     - Apply each proposal using corresponding `apply_*` tool
     - Update proposal status to `confirmed`
     - Return: `{ results: [{ proposal_id, success, entity_id, error? }] }`

3. **`PATCH /api/assistant/proposals/{proposal_id}`**
   - Input: `{ revised_payload: object, status?: "revised" | "discarded" }`
   - Updates proposal revision or discards it

4. **`GET /api/assistant/conversations`**
   - Returns list of user's conversations (paginated)

5. **`GET /api/assistant/conversations/{conversation_id}`**
   - Returns conversation with all messages and proposals

6. **`DELETE /api/assistant/conversations/{conversation_id}`**
   - Deletes conversation and all associated messages/proposals

### New Service: `backend/app/services/assistant_service.py`

Orchestrates LLM interaction:

```
class AssistantService:
    - __init__(db: Session, user_id: str)
    - process_message(conversation_id, message, image_url) -> AssistantResponse
    - _build_context(conversation) -> list[dict]
    - _call_llm(messages, tools) -> LLMResponse
    - _execute_tool(tool_name, arguments) -> ToolResult
    - _create_proposals(tool_calls) -> list[ActionProposal]
```

### New Service: `backend/app/services/tool_registry.py`

Defines and executes tools:

```python
class ToolRegistry:
    tools: dict[str, ToolDefinition]
    
    def get_tool_definitions() -> list[dict]  # OpenAI function format
    def execute(name, arguments, db, user_id) -> ToolResult
    def is_read_tool(name) -> bool
    def is_write_tool(name) -> bool
```

### New Module: `backend/app/tools/`

#### Directory Structure

```
backend/app/tools/
├── __init__.py
├── base.py           # BaseTool class and ToolResult
├── read/
│   ├── __init__.py
│   ├── get_transactions.py
│   ├── get_budget_overview.py
│   ├── get_cashflow_summary.py
│   └── get_accounts.py
└── write/
    ├── __init__.py
    ├── propose_transaction.py
    ├── apply_transaction.py
    ├── propose_budget_plan.py
    ├── apply_budget_plan.py
    ├── propose_category_changes.py
    └── apply_category_changes.py
```

#### Tool Base Class

```python
@dataclass
class ToolDefinition:
    name: str
    description: str
    input_schema: dict  # JSON Schema
    result_schema: dict
    kind: Literal["read", "write"]
    requires_confirmation: bool = None  # defaults to kind == "write"

class BaseTool(ABC):
    definition: ToolDefinition
    
    @abstractmethod
    def execute(self, arguments: dict, db: Session, user_id: str) -> ToolResult
```

### Tool Definitions

#### Read Tools (auto-execute)

1. **`get_transactions`**
   - Input: `{ date_from?, date_to?, category_id?, account_id?, limit?, search? }`
   - Output: `{ transactions: Transaction[], total_count: int }`

2. **`get_budget_overview`**
   - Input: `{ month: string }` (YYYY-MM)
   - Output: `{ budgets: [{ category, limit, spent, remaining, percentage }] }`

3. **`get_cashflow_summary`**
   - Input: `{ period: "week" | "month" | "custom", date_from?, date_to? }`
   - Output: `{ income, expense, net, by_category: [{ category, amount }] }`

4. **`get_accounts`**
   - Input: `{}`
   - Output: `{ accounts: Account[] }`

#### Write Tools (proposal mode)

5. **`propose_transaction`**
   - Input: `{ source_text: string, fallback_date?: string, ocr_text?: string }`
   - Output: `{ proposals: [TransactionProposal] }`
   - Logic: Parse user text to extract date, amount, category, account, description

6. **`apply_transaction`** (internal only, called on confirm)
   - Input: `{ transaction: TransactionCreate }`
   - Output: `{ transaction_id: string }`

7. **`propose_budget_plan`**
   - Input: `{ income, target_savings?, mandatory_payments?: [{ name, amount }], preferences?: string }`
   - Output: `{ proposals: [{ category_id, category_name, suggested_amount }] }`

8. **`apply_budget_plan`** (internal only)
   - Input: `{ allocations: [{ category_id, amount, month }] }`
   - Output: `{ budget_ids: string[] }`

9. **`propose_category_changes`**
   - Input: `{ instructions: string }` (e.g., "merge Coffee into Food")
   - Output: `{ proposals: [{ action: "create" | "rename" | "merge" | "delete", ... }] }`

10. **`apply_category_changes`** (internal only)
    - Input: `{ changes: CategoryChange[] }`
    - Output: `{ results: [{ action, success, category_id? }] }`

### New Schemas: `backend/app/schemas/assistant.py`

```python
# Request/Response models
class MessageRequest(BaseModel):
    conversation_id: str | None
    message: str
    image_url: str | None

class MessageResponse(BaseModel):
    conversation_id: str
    message_id: str
    content: str
    tool_calls: list[ToolCallInfo]
    proposals: list[ProposalResponse]

class ProposalResponse(BaseModel):
    id: str
    proposal_type: str
    status: str
    payload: dict
    
class ApplyRequest(BaseModel):
    proposal_ids: list[str]
    revisions: dict[str, dict] | None

class ApplyResult(BaseModel):
    proposal_id: str
    success: bool
    entity_id: str | None
    error: str | None
```

### New Models: `backend/app/models/assistant.py`

SQLAlchemy models for `conversations`, `conversation_messages`, `action_proposals`.

### LLM Integration: `backend/app/services/llm_client.py`

```python
class LLMClient:
    def __init__(self, api_key: str, model: str = "gpt-4o")
    
    async def chat_completion(
        messages: list[dict],
        tools: list[dict],
        tool_choice: str = "auto"
    ) -> ChatCompletionResponse
```

### Configuration Updates: `backend/app/config.py`

Add:
```python
OPENAI_API_KEY: str = ""
ASSISTANT_MODEL: str = "gpt-4o"
ASSISTANT_SYSTEM_PROMPT: str = "..."  # Or load from file
```

---

## Frontend Changes

### New Directory: `frontend/components/assistant/`

```
frontend/components/assistant/
├── AssistantPanel.tsx       # Main chat container (sidebar or modal)
├── MessageList.tsx          # Chat message bubbles
├── MessageBubble.tsx        # Individual message component
├── UserMessage.tsx          # User message with optional image
├── AssistantMessage.tsx     # Assistant message with tool indicators
├── ChatInput.tsx            # Input field with image upload
├── ToolIndicator.tsx        # "Using: Budget Overview" label
├── proposals/
│   ├── ProposalCard.tsx     # Generic proposal card wrapper
│   ├── TransactionProposal.tsx
│   ├── BudgetPlanProposal.tsx
│   └── CategoryChangeProposal.tsx
└── index.ts
```

### Component Specifications

#### `AssistantPanel.tsx`

Main chat container component:
- Props: `{ isOpen, onClose, initialConversationId? }`
- State:
  - `messages: ConversationMessage[]`
  - `proposals: Map<string, Proposal>`
  - `isLoading: boolean`
  - `conversationId: string | null`
- Features:
  - Streaming text display (optional, can be polling-based initially)
  - Auto-scroll to latest message
  - Conversation history selector

#### `MessageList.tsx`

Renders message history:
- Groups consecutive tool messages
- Shows tool indicators under assistant messages
- Renders proposal cards inline

#### `ChatInput.tsx`

User input component:
- Text input with submit on Enter
- Image attachment button (opens file picker)
- Image preview before send
- Loading state during API call

#### `ProposalCard.tsx`

Generic proposal card with:
- Header showing proposal type
- Editable form fields (pre-filled from payload)
- Action buttons: **Confirm**, **Edit** (toggle edit mode), **Discard**
- Status indicator (pending/confirmed/discarded)
- Callback: `onConfirm(proposalId, payload)`, `onDiscard(proposalId)`

#### `TransactionProposal.tsx`

Transaction-specific proposal:
- Fields: date, amount, type, category, account, description
- Category/account dropdowns populated from context
- Amount field with currency formatting

#### `BudgetPlanProposal.tsx`

Budget allocation proposal:
- Table with category rows
- Editable amount per category
- "Add Category" row
- Total summary

### New API Client: `frontend/lib/assistant-api.ts`

```typescript
interface ConversationMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  imageUrl?: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  toolName?: string;
  createdAt: string;
}

interface Proposal {
  id: string;
  proposalType: "transaction" | "budget" | "category";
  status: "pending" | "confirmed" | "revised" | "discarded";
  payload: Record<string, unknown>;
}

interface MessageResponse {
  conversationId: string;
  messageId: string;
  content: string;
  toolCalls: ToolCall[];
  proposals: Proposal[];
}

export async function sendMessage(params: {
  conversationId?: string;
  message: string;
  imageUrl?: string;
}): Promise<MessageResponse>;

export async function applyProposals(params: {
  proposalIds: string[];
  revisions?: Record<string, unknown>;
}): Promise<ApplyResult[]>;

export async function updateProposal(
  proposalId: string,
  update: { revisedPayload?: unknown; status?: string }
): Promise<Proposal>;

export async function getConversations(): Promise<Conversation[]>;
export async function getConversation(id: string): Promise<ConversationDetail>;
export async function deleteConversation(id: string): Promise<void>;
```

### New Types: `frontend/types/assistant.ts`

TypeScript interfaces for all assistant-related data structures.

### State Management: `frontend/lib/hooks/useAssistant.ts`

Custom hook for assistant state:

```typescript
function useAssistant(initialConversationId?: string) {
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [proposals, setProposals] = useState<Map<string, Proposal>>();
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (message: string, imageUrl?: string) => {...};
  const confirmProposal = async (proposalId: string, payload: unknown) => {...};
  const discardProposal = async (proposalId: string) => {...};
  const reviseProposal = (proposalId: string, payload: unknown) => {...};

  return { messages, proposals, isLoading, sendMessage, confirmProposal, discardProposal, reviseProposal };
}
```

### Integration Point: Dashboard or Floating Button

Option A: Floating chat button (bottom-right corner)
- `frontend/components/assistant/AssistantTrigger.tsx`
- Opens `AssistantPanel` as slide-in panel or modal

Option B: Dedicated `/assistant` page
- `frontend/app/(authenticated)/assistant/page.tsx`
- Full-page chat interface

---

## Logic Flow

### Message Processing Flow

1. User sends message via `ChatInput`
2. Frontend calls `POST /api/assistant/message`
3. Backend:
   - Creates/retrieves conversation
   - Stores user message
   - Sends to LLM: `[system_prompt, ...history, user_message]` + tool definitions
4. LLM responds with text + optional tool_calls
5. Backend processes tool calls:
   - **Read tool**: Execute immediately, add tool result to messages, re-call LLM
   - **Propose tool**: Execute to generate proposals, store in `action_proposals`
6. Loop until LLM returns no tool calls
7. Store final assistant message
8. Return response with `{ content, tool_calls, proposals }`
9. Frontend displays message and proposal cards

### Proposal Confirmation Flow

1. User clicks **Confirm** on proposal card
2. Frontend calls `POST /api/assistant/apply` with `proposal_ids`
3. Backend:
   - Loads proposals, validates ownership
   - For each proposal:
     - Get payload (revised if available, else original)
     - Call appropriate `apply_*` tool
     - Update proposal status to `confirmed`
     - Store result_id
4. Return results
5. Frontend updates proposal card UI (shows "Applied" state)

### Revision Flow (via Chat)

1. User says "Change the amount to 50k"
2. LLM recognizes context (active proposal exists)
3. LLM emits instruction to revise proposal (or frontend interprets)
4. Frontend/Backend updates `revised_payload` on proposal
5. UI reflects updated values

### Image Processing Flow

1. User uploads image via `ChatInput`
2. Frontend uploads to storage (S3/Cloudinary) or sends as base64
3. Backend receives `image_url` or base64 data
4. OCR extraction (Tesseract, Google Vision, or GPT-4o vision)
5. Extracted text passed to LLM as additional context
6. LLM calls `propose_transaction` with OCR text

---

## System Prompt Template

```markdown
You are Dompy, a helpful personal finance assistant. You help users manage their transactions, budgets, and accounts.

## Your Capabilities

You have access to tools that let you:
- Read financial data: transactions, budgets, accounts, summaries
- Propose changes: new transactions, budget plans, category modifications

## Tool Usage Rules

1. **Read tools** (get_transactions, get_budget_overview, get_cashflow_summary, get_accounts):
   - Use freely to answer questions about user's finances
   - These execute automatically

2. **Propose tools** (propose_transaction, propose_budget_plan, propose_category_changes):
   - Use when user wants to add/change data
   - These create proposals that user must confirm
   - Never assume confirmation - always wait for user

3. **Apply tools** (apply_transaction, apply_budget_plan, apply_category_changes):
   - NEVER call these directly
   - The system handles application after user confirms

## Conversation Style

- Be concise and helpful
- Use the user's language (detect from their message)
- When proposing changes, explain briefly what you're creating
- If unsure about something (amount, category, date), ask
- Format currency as IDR (Indonesian Rupiah) using Rp prefix

## Context

Today's date: {current_date}
User's accounts: {account_list}
User's expense categories: {expense_categories}
User's income categories: {income_categories}
```

---

## Phases

### Phase 1: Data Layer & Core Backend

1. Create migration for `conversations`, `conversation_messages`, `action_proposals`
2. Create SQLAlchemy models
3. Create Pydantic schemas
4. Add config for OpenAI API key

### Phase 2A: Tool System

1. Implement `ToolRegistry` and `BaseTool`
2. Implement read tools: `get_transactions`, `get_budget_overview`, `get_cashflow_summary`, `get_accounts`
3. Implement propose tools: `propose_transaction`, `propose_budget_plan`, `propose_category_changes`
4. Implement apply tools (internal): `apply_transaction`, `apply_budget_plan`, `apply_category_changes`

### Phase 2B: LLM Orchestration

1. Implement `LLMClient` with OpenAI API
2. Implement `AssistantService` orchestration logic
3. Implement `/api/assistant/*` endpoints
4. Write unit tests for tool execution

### Phase 3A: Frontend Chat UI

1. Create `AssistantPanel`, `MessageList`, `ChatInput` components
2. Implement `useAssistant` hook
3. Create `assistant-api.ts` client
4. Add floating trigger button to layout

### Phase 3B: Proposal Cards

1. Create `ProposalCard` generic component
2. Create `TransactionProposal` with form fields
3. Create `BudgetPlanProposal` with table
4. Create `CategoryChangeProposal`
5. Wire up confirm/discard/revise actions

### Phase 4: Polish & Image Support

1. Add image upload to `ChatInput`
2. Integrate OCR (GPT-4o vision or external)
3. Add tool indicators to assistant messages
4. Add conversation history sidebar
5. Improve error handling and loading states

---

## File Summary

### Backend - New Files

| Path | Purpose |
|------|---------|
| `backend/alembic/versions/..._add_assistant_tables.py` | Migration |
| `backend/app/models/assistant.py` | Conversation, Message, Proposal models |
| `backend/app/schemas/assistant.py` | Request/Response schemas |
| `backend/app/routers/assistant.py` | API endpoints |
| `backend/app/services/assistant_service.py` | LLM orchestration |
| `backend/app/services/llm_client.py` | OpenAI client wrapper |
| `backend/app/services/tool_registry.py` | Tool definitions and execution |
| `backend/app/tools/__init__.py` | Tool module init |
| `backend/app/tools/base.py` | BaseTool class |
| `backend/app/tools/read/*.py` | Read tool implementations |
| `backend/app/tools/write/*.py` | Write tool implementations |

### Backend - Modified Files

| Path | Change |
|------|--------|
| `backend/app/main.py` | Register assistant router |
| `backend/app/config.py` | Add OpenAI config |
| `backend/app/models/__init__.py` | Export new models |
| `backend/requirements.txt` | Add `openai`, `tiktoken` |

### Frontend - New Files

| Path | Purpose |
|------|---------|
| `frontend/components/assistant/AssistantPanel.tsx` | Main chat container |
| `frontend/components/assistant/MessageList.tsx` | Message rendering |
| `frontend/components/assistant/MessageBubble.tsx` | Individual message |
| `frontend/components/assistant/ChatInput.tsx` | Input with image upload |
| `frontend/components/assistant/ToolIndicator.tsx` | Tool usage label |
| `frontend/components/assistant/proposals/*.tsx` | Proposal card components |
| `frontend/components/assistant/AssistantTrigger.tsx` | Floating button |
| `frontend/lib/assistant-api.ts` | API client |
| `frontend/lib/hooks/useAssistant.ts` | State management hook |
| `frontend/types/assistant.ts` | TypeScript types |

### Frontend - Modified Files

| Path | Change |
|------|--------|
| `frontend/app/(authenticated)/layout.tsx` | Add AssistantTrigger |
| `frontend/types/index.ts` | Re-export assistant types |


## Context

Dompy Assistant is a ChatGPT-style conversational interface for personal finance management. Users interact via natural language (and images), and the assistant uses **tools** to read data (transactions, budgets, accounts, summaries) and propose changes (new transactions, updated budgets, new categories). Read tools execute automatically; write tools generate **proposals** shown as UI cards that require user confirmation before database modification.

The user experience goal: "I just talk to it. It figures out what to do, shows me the plan, and I approve or adjust."

---

## Data Layer

### New Database Tables

#### 1. `conversations` Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique conversation identifier |
| `user_id` | VARCHAR | NOT NULL, FK | Clerk user ID |
| `title` | VARCHAR(255) | | Auto-generated or user-set title |
| `created_at` | TIMESTAMP | NOT NULL | Creation timestamp |
| `updated_at` | TIMESTAMP | NOT NULL | Last activity timestamp |

#### 2. `conversation_messages` Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique message identifier |
| `conversation_id` | UUID | NOT NULL, FK | Parent conversation |
| `role` | VARCHAR(20) | NOT NULL | `user`, `assistant`, `system`, `tool` |
| `content` | TEXT | | Message text content |
| `image_url` | TEXT | | Optional image attachment URL |
| `tool_calls` | JSONB | | Array of tool calls made (for assistant messages) |
| `tool_call_id` | VARCHAR(100) | | Tool call ID (for tool result messages) |
| `tool_name` | VARCHAR(100) | | Tool name (for tool result messages) |
| `created_at` | TIMESTAMP | NOT NULL | Message timestamp |

#### 3. `action_proposals` Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Proposal identifier |
| `conversation_id` | UUID | NOT NULL, FK | Parent conversation |
| `message_id` | UUID | NOT NULL, FK | Message that created proposal |
| `proposal_type` | VARCHAR(50) | NOT NULL | `transaction`, `budget`, `category`, `transfer` |
| `status` | VARCHAR(20) | NOT NULL | `pending`, `confirmed`, `revised`, `discarded` |
| `original_payload` | JSONB | NOT NULL | Initial payload from tool |
| `revised_payload` | JSONB | | User-modified payload |
| `applied_at` | TIMESTAMP | | When applied to DB |
| `result_id` | UUID | | ID of created/updated entity |
| `created_at` | TIMESTAMP | NOT NULL | Creation timestamp |

### Migration File

- `backend/alembic/versions/YYYYMMDD_HHMMSS_add_assistant_tables.py`

---

## Backend Changes

### New Router: `backend/app/routers/assistant.py`

#### Endpoints

1. **`POST /api/assistant/message`**
   - Input: `{ conversation_id?: string, message: string, image_url?: string }`
   - Process:
     - Create/retrieve conversation
     - Store user message
     - Call LLM with tool definitions + conversation history
     - Execute read tools automatically (loop until no more tool calls)
     - For write tools, generate proposals (do NOT apply)
     - Store assistant message with tool_calls
     - Return: `{ message_id, content, tool_calls, proposals }`

2. **`POST /api/assistant/apply`**
   - Input: `{ proposal_ids: string[], revisions?: Record<string, object> }`
   - Process:
     - Validate proposal ownership and status
     - Apply each proposal using corresponding `apply_*` tool
     - Update proposal status to `confirmed`
     - Return: `{ results: [{ proposal_id, success, entity_id, error? }] }`

3. **`PATCH /api/assistant/proposals/{proposal_id}`**
   - Input: `{ revised_payload: object, status?: "revised" | "discarded" }`
   - Updates proposal revision or discards it

4. **`GET /api/assistant/conversations`**
   - Returns list of user's conversations (paginated)

5. **`GET /api/assistant/conversations/{conversation_id}`**
   - Returns conversation with all messages and proposals

6. **`DELETE /api/assistant/conversations/{conversation_id}`**
   - Deletes conversation and all associated messages/proposals

### New Service: `backend/app/services/assistant_service.py`

Orchestrates LLM interaction:

```
class AssistantService:
    - __init__(db: Session, user_id: str)
    - process_message(conversation_id, message, image_url) -> AssistantResponse
    - _build_context(conversation) -> list[dict]
    - _call_llm(messages, tools) -> LLMResponse
    - _execute_tool(tool_name, arguments) -> ToolResult
    - _create_proposals(tool_calls) -> list[ActionProposal]
```

### New Service: `backend/app/services/tool_registry.py`

Defines and executes tools:

```python
class ToolRegistry:
    tools: dict[str, ToolDefinition]
    
    def get_tool_definitions() -> list[dict]  # OpenAI function format
    def execute(name, arguments, db, user_id) -> ToolResult
    def is_read_tool(name) -> bool
    def is_write_tool(name) -> bool
```

### New Module: `backend/app/tools/`

#### Directory Structure

```
backend/app/tools/
├── __init__.py
├── base.py           # BaseTool class and ToolResult
├── read/
│   ├── __init__.py
│   ├── get_transactions.py
│   ├── get_budget_overview.py
│   ├── get_cashflow_summary.py
│   └── get_accounts.py
└── write/
    ├── __init__.py
    ├── propose_transaction.py
    ├── apply_transaction.py
    ├── propose_budget_plan.py
    ├── apply_budget_plan.py
    ├── propose_category_changes.py
    └── apply_category_changes.py
```

#### Tool Base Class

```python
@dataclass
class ToolDefinition:
    name: str
    description: str
    input_schema: dict  # JSON Schema
    result_schema: dict
    kind: Literal["read", "write"]
    requires_confirmation: bool = None  # defaults to kind == "write"

class BaseTool(ABC):
    definition: ToolDefinition
    
    @abstractmethod
    def execute(self, arguments: dict, db: Session, user_id: str) -> ToolResult
```

### Tool Definitions

#### Read Tools (auto-execute)

1. **`get_transactions`**
   - Input: `{ date_from?, date_to?, category_id?, account_id?, limit?, search? }`
   - Output: `{ transactions: Transaction[], total_count: int }`

2. **`get_budget_overview`**
   - Input: `{ month: string }` (YYYY-MM)
   - Output: `{ budgets: [{ category, limit, spent, remaining, percentage }] }`

3. **`get_cashflow_summary`**
   - Input: `{ period: "week" | "month" | "custom", date_from?, date_to? }`
   - Output: `{ income, expense, net, by_category: [{ category, amount }] }`

4. **`get_accounts`**
   - Input: `{}`
   - Output: `{ accounts: Account[] }`

#### Write Tools (proposal mode)

5. **`propose_transaction`**
   - Input: `{ source_text: string, fallback_date?: string, ocr_text?: string }`
   - Output: `{ proposals: [TransactionProposal] }`
   - Logic: Parse user text to extract date, amount, category, account, description

6. **`apply_transaction`** (internal only, called on confirm)
   - Input: `{ transaction: TransactionCreate }`
   - Output: `{ transaction_id: string }`

7. **`propose_budget_plan`**
   - Input: `{ income, target_savings?, mandatory_payments?: [{ name, amount }], preferences?: string }`
   - Output: `{ proposals: [{ category_id, category_name, suggested_amount }] }`

8. **`apply_budget_plan`** (internal only)
   - Input: `{ allocations: [{ category_id, amount, month }] }`
   - Output: `{ budget_ids: string[] }`

9. **`propose_category_changes`**
   - Input: `{ instructions: string }` (e.g., "merge Coffee into Food")
   - Output: `{ proposals: [{ action: "create" | "rename" | "merge" | "delete", ... }] }`

10. **`apply_category_changes`** (internal only)
    - Input: `{ changes: CategoryChange[] }`
    - Output: `{ results: [{ action, success, category_id? }] }`

### New Schemas: `backend/app/schemas/assistant.py`

```python
# Request/Response models
class MessageRequest(BaseModel):
    conversation_id: str | None
    message: str
    image_url: str | None

class MessageResponse(BaseModel):
    conversation_id: str
    message_id: str
    content: str
    tool_calls: list[ToolCallInfo]
    proposals: list[ProposalResponse]

class ProposalResponse(BaseModel):
    id: str
    proposal_type: str
    status: str
    payload: dict
    
class ApplyRequest(BaseModel):
    proposal_ids: list[str]
    revisions: dict[str, dict] | None

class ApplyResult(BaseModel):
    proposal_id: str
    success: bool
    entity_id: str | None
    error: str | None
```

### New Models: `backend/app/models/assistant.py`

SQLAlchemy models for `conversations`, `conversation_messages`, `action_proposals`.

### LLM Integration: `backend/app/services/llm_client.py`

```python
class LLMClient:
    def __init__(self, api_key: str, model: str = "gpt-4o")
    
    async def chat_completion(
        messages: list[dict],
        tools: list[dict],
        tool_choice: str = "auto"
    ) -> ChatCompletionResponse
```

### Configuration Updates: `backend/app/config.py`

Add:
```python
OPENAI_API_KEY: str = ""
ASSISTANT_MODEL: str = "gpt-4o"
ASSISTANT_SYSTEM_PROMPT: str = "..."  # Or load from file
```

---

## Frontend Changes

### New Directory: `frontend/components/assistant/`

```
frontend/components/assistant/
├── AssistantPanel.tsx       # Main chat container (sidebar or modal)
├── MessageList.tsx          # Chat message bubbles
├── MessageBubble.tsx        # Individual message component
├── UserMessage.tsx          # User message with optional image
├── AssistantMessage.tsx     # Assistant message with tool indicators
├── ChatInput.tsx            # Input field with image upload
├── ToolIndicator.tsx        # "Using: Budget Overview" label
├── proposals/
│   ├── ProposalCard.tsx     # Generic proposal card wrapper
│   ├── TransactionProposal.tsx
│   ├── BudgetPlanProposal.tsx
│   └── CategoryChangeProposal.tsx
└── index.ts
```

### Component Specifications

#### `AssistantPanel.tsx`

Main chat container component:
- Props: `{ isOpen, onClose, initialConversationId? }`
- State:
  - `messages: ConversationMessage[]`
  - `proposals: Map<string, Proposal>`
  - `isLoading: boolean`
  - `conversationId: string | null`
- Features:
  - Streaming text display (optional, can be polling-based initially)
  - Auto-scroll to latest message
  - Conversation history selector

#### `MessageList.tsx`

Renders message history:
- Groups consecutive tool messages
- Shows tool indicators under assistant messages
- Renders proposal cards inline

#### `ChatInput.tsx`

User input component:
- Text input with submit on Enter
- Image attachment button (opens file picker)
- Image preview before send
- Loading state during API call

#### `ProposalCard.tsx`

Generic proposal card with:
- Header showing proposal type
- Editable form fields (pre-filled from payload)
- Action buttons: **Confirm**, **Edit** (toggle edit mode), **Discard**
- Status indicator (pending/confirmed/discarded)
- Callback: `onConfirm(proposalId, payload)`, `onDiscard(proposalId)`

#### `TransactionProposal.tsx`

Transaction-specific proposal:
- Fields: date, amount, type, category, account, description
- Category/account dropdowns populated from context
- Amount field with currency formatting

#### `BudgetPlanProposal.tsx`

Budget allocation proposal:
- Table with category rows
- Editable amount per category
- "Add Category" row
- Total summary

### New API Client: `frontend/lib/assistant-api.ts`

```typescript
interface ConversationMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  imageUrl?: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  toolName?: string;
  createdAt: string;
}

interface Proposal {
  id: string;
  proposalType: "transaction" | "budget" | "category";
  status: "pending" | "confirmed" | "revised" | "discarded";
  payload: Record<string, unknown>;
}

interface MessageResponse {
  conversationId: string;
  messageId: string;
  content: string;
  toolCalls: ToolCall[];
  proposals: Proposal[];
}

export async function sendMessage(params: {
  conversationId?: string;
  message: string;
  imageUrl?: string;
}): Promise<MessageResponse>;

export async function applyProposals(params: {
  proposalIds: string[];
  revisions?: Record<string, unknown>;
}): Promise<ApplyResult[]>;

export async function updateProposal(
  proposalId: string,
  update: { revisedPayload?: unknown; status?: string }
): Promise<Proposal>;

export async function getConversations(): Promise<Conversation[]>;
export async function getConversation(id: string): Promise<ConversationDetail>;
export async function deleteConversation(id: string): Promise<void>;
```

### New Types: `frontend/types/assistant.ts`

TypeScript interfaces for all assistant-related data structures.

### State Management: `frontend/lib/hooks/useAssistant.ts`

Custom hook for assistant state:

```typescript
function useAssistant(initialConversationId?: string) {
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [proposals, setProposals] = useState<Map<string, Proposal>>();
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (message: string, imageUrl?: string) => {...};
  const confirmProposal = async (proposalId: string, payload: unknown) => {...};
  const discardProposal = async (proposalId: string) => {...};
  const reviseProposal = (proposalId: string, payload: unknown) => {...};

  return { messages, proposals, isLoading, sendMessage, confirmProposal, discardProposal, reviseProposal };
}
```

### Integration Point: Dashboard or Floating Button

Option A: Floating chat button (bottom-right corner)
- `frontend/components/assistant/AssistantTrigger.tsx`
- Opens `AssistantPanel` as slide-in panel or modal

Option B: Dedicated `/assistant` page
- `frontend/app/(authenticated)/assistant/page.tsx`
- Full-page chat interface

---

## Logic Flow

### Message Processing Flow

1. User sends message via `ChatInput`
2. Frontend calls `POST /api/assistant/message`
3. Backend:
   - Creates/retrieves conversation
   - Stores user message
   - Sends to LLM: `[system_prompt, ...history, user_message]` + tool definitions
4. LLM responds with text + optional tool_calls
5. Backend processes tool calls:
   - **Read tool**: Execute immediately, add tool result to messages, re-call LLM
   - **Propose tool**: Execute to generate proposals, store in `action_proposals`
6. Loop until LLM returns no tool calls
7. Store final assistant message
8. Return response with `{ content, tool_calls, proposals }`
9. Frontend displays message and proposal cards

### Proposal Confirmation Flow

1. User clicks **Confirm** on proposal card
2. Frontend calls `POST /api/assistant/apply` with `proposal_ids`
3. Backend:
   - Loads proposals, validates ownership
   - For each proposal:
     - Get payload (revised if available, else original)
     - Call appropriate `apply_*` tool
     - Update proposal status to `confirmed`
     - Store result_id
4. Return results
5. Frontend updates proposal card UI (shows "Applied" state)

### Revision Flow (via Chat)

1. User says "Change the amount to 50k"
2. LLM recognizes context (active proposal exists)
3. LLM emits instruction to revise proposal (or frontend interprets)
4. Frontend/Backend updates `revised_payload` on proposal
5. UI reflects updated values

### Image Processing Flow

1. User uploads image via `ChatInput`
2. Frontend uploads to storage (S3/Cloudinary) or sends as base64
3. Backend receives `image_url` or base64 data
4. OCR extraction (Tesseract, Google Vision, or GPT-4o vision)
5. Extracted text passed to LLM as additional context
6. LLM calls `propose_transaction` with OCR text

---

## System Prompt Template

```markdown
You are Dompy, a helpful personal finance assistant. You help users manage their transactions, budgets, and accounts.

## Your Capabilities

You have access to tools that let you:
- Read financial data: transactions, budgets, accounts, summaries
- Propose changes: new transactions, budget plans, category modifications

## Tool Usage Rules

1. **Read tools** (get_transactions, get_budget_overview, get_cashflow_summary, get_accounts):
   - Use freely to answer questions about user's finances
   - These execute automatically

2. **Propose tools** (propose_transaction, propose_budget_plan, propose_category_changes):
   - Use when user wants to add/change data
   - These create proposals that user must confirm
   - Never assume confirmation - always wait for user

3. **Apply tools** (apply_transaction, apply_budget_plan, apply_category_changes):
   - NEVER call these directly
   - The system handles application after user confirms

## Conversation Style

- Be concise and helpful
- Use the user's language (detect from their message)
- When proposing changes, explain briefly what you're creating
- If unsure about something (amount, category, date), ask
- Format currency as IDR (Indonesian Rupiah) using Rp prefix

## Context

Today's date: {current_date}
User's accounts: {account_list}
User's expense categories: {expense_categories}
User's income categories: {income_categories}
```

---

## Phases

### Phase 1: Data Layer & Core Backend

1. Create migration for `conversations`, `conversation_messages`, `action_proposals`
2. Create SQLAlchemy models
3. Create Pydantic schemas
4. Add config for OpenAI API key

### Phase 2A: Tool System

1. Implement `ToolRegistry` and `BaseTool`
2. Implement read tools: `get_transactions`, `get_budget_overview`, `get_cashflow_summary`, `get_accounts`
3. Implement propose tools: `propose_transaction`, `propose_budget_plan`, `propose_category_changes`
4. Implement apply tools (internal): `apply_transaction`, `apply_budget_plan`, `apply_category_changes`

### Phase 2B: LLM Orchestration

1. Implement `LLMClient` with OpenAI API
2. Implement `AssistantService` orchestration logic
3. Implement `/api/assistant/*` endpoints
4. Write unit tests for tool execution

### Phase 3A: Frontend Chat UI

1. Create `AssistantPanel`, `MessageList`, `ChatInput` components
2. Implement `useAssistant` hook
3. Create `assistant-api.ts` client
4. Add floating trigger button to layout

### Phase 3B: Proposal Cards

1. Create `ProposalCard` generic component
2. Create `TransactionProposal` with form fields
3. Create `BudgetPlanProposal` with table
4. Create `CategoryChangeProposal`
5. Wire up confirm/discard/revise actions

### Phase 4: Polish & Image Support

1. Add image upload to `ChatInput`
2. Integrate OCR (GPT-4o vision or external)
3. Add tool indicators to assistant messages
4. Add conversation history sidebar
5. Improve error handling and loading states

---

## File Summary

### Backend - New Files

| Path | Purpose |
|------|---------|
| `backend/alembic/versions/..._add_assistant_tables.py` | Migration |
| `backend/app/models/assistant.py` | Conversation, Message, Proposal models |
| `backend/app/schemas/assistant.py` | Request/Response schemas |
| `backend/app/routers/assistant.py` | API endpoints |
| `backend/app/services/assistant_service.py` | LLM orchestration |
| `backend/app/services/llm_client.py` | OpenAI client wrapper |
| `backend/app/services/tool_registry.py` | Tool definitions and execution |
| `backend/app/tools/__init__.py` | Tool module init |
| `backend/app/tools/base.py` | BaseTool class |
| `backend/app/tools/read/*.py` | Read tool implementations |
| `backend/app/tools/write/*.py` | Write tool implementations |

### Backend - Modified Files

| Path | Change |
|------|--------|
| `backend/app/main.py` | Register assistant router |
| `backend/app/config.py` | Add OpenAI config |
| `backend/app/models/__init__.py` | Export new models |
| `backend/requirements.txt` | Add `openai`, `tiktoken` |

### Frontend - New Files

| Path | Purpose |
|------|---------|
| `frontend/components/assistant/AssistantPanel.tsx` | Main chat container |
| `frontend/components/assistant/MessageList.tsx` | Message rendering |
| `frontend/components/assistant/MessageBubble.tsx` | Individual message |
| `frontend/components/assistant/ChatInput.tsx` | Input with image upload |
| `frontend/components/assistant/ToolIndicator.tsx` | Tool usage label |
| `frontend/components/assistant/proposals/*.tsx` | Proposal card components |
| `frontend/components/assistant/AssistantTrigger.tsx` | Floating button |
| `frontend/lib/assistant-api.ts` | API client |
| `frontend/lib/hooks/useAssistant.ts` | State management hook |
| `frontend/types/assistant.ts` | TypeScript types |

### Frontend - Modified Files

| Path | Change |
|------|--------|
| `frontend/app/(authenticated)/layout.tsx` | Add AssistantTrigger |
| `frontend/types/index.ts` | Re-export assistant types |

