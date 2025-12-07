# Feature 0021: Quick Action Buttons for Proposals in Chat

## Context

Currently, when the assistant creates a proposal (e.g., transaction, budget), users must type "yes" or "confirm" in the chat to apply it. This creates a loop where the assistant asks for confirmation multiple times, requiring multiple chat interactions. Users want quick action buttons (Confirm/Edit) directly on the assistant message bubble when proposals are present. Clicking Confirm should immediately apply the proposal without requiring chat confirmation. Clicking Edit should open a popup dialog to modify the proposal before confirming.

## Data Layer

No database changes required. The proposal data structure already exists and supports the required operations.

### Existing Data Structures

- `Proposal` interface in `frontend/types/assistant.ts` already has all required fields
- Backend `ProposalResponse` schema includes `message_id` relationship (stored in DB but not currently exposed in API response)
- Proposals are already linked to messages via `message_id` in the database

### Required Backend Change

- Modify `backend/app/schemas/assistant.py` - `ProposalResponse` to include `message_id` field
- Modify `backend/app/routers/assistant.py` - Include `message_id` when returning proposals in `MessageResponse`
- Modify `backend/app/services/assistant_service.py` - Include `message_id` in proposal response data

## Backend Changes

### 1. Update ProposalResponse Schema

**File**: `backend/app/schemas/assistant.py`

- Add `message_id: UUID` field to `ProposalResponse` class
- This links proposals to their originating assistant message

### 2. Update Assistant Service

**File**: `backend/app/services/assistant_service.py`

- In `process_message()` method, when building proposal response data, include `message_id` from the stored proposal
- The `ActionProposal` model already has `message_id` field, so extract it when building response

### 3. Update Assistant Router

**File**: `backend/app/routers/assistant.py`

- In `send_message()` endpoint, ensure `message_id` is included in `ProposalResponse` objects
- In `get_conversation()` endpoint, include `message_id` in proposal responses

## Frontend Changes

### 1. Update TypeScript Types

**File**: `frontend/types/assistant.ts`

- Add `messageId?: string` field to `Proposal` interface
- This allows linking proposals to their messages

### 2. Update MessageBubble Component

**File**: `frontend/components/assistant/MessageBubble.tsx`

- Add props: `proposals?: Proposal[]` and callback functions `onConfirmProposal`, `onEditProposal`
- When `message.role === "assistant"` and proposals exist for this message:
  - Display quick action buttons below the message content
  - Buttons: "Confirm" (primary) and "Edit" (secondary)
  - Only show buttons for proposals with status "pending" or "revised"
  - Hide buttons for "confirmed" or "discarded" proposals
- Button styling should match existing UI design system
- Position buttons below message content, aligned with message bubble

### 3. Update MessageList Component

**File**: `frontend/components/assistant/MessageList.tsx`

- Group proposals by `messageId` instead of showing all pending proposals at the end
- Pass proposals to `MessageBubble` component for each message
- Create a map: `messageId -> Proposal[]` to efficiently look up proposals per message
- Remove the separate "Pending proposals" section that shows all proposals at the bottom
- Keep the `ProposalCard` component rendering for detailed view (optional, can be removed if quick actions replace it)

### 4. Create ProposalEditDialog Component

**File**: `frontend/components/assistant/ProposalEditDialog.tsx` (new file)

- Use existing `Dialog` component from `@/components/ui/dialog`
- Accept props: `proposal: Proposal`, `open: boolean`, `onOpenChange: (open: boolean) => void`, `onSave: (payload: Record<string, unknown>) => void`
- Render appropriate edit form based on `proposal.proposalType`:
  - For "transaction": Show form with amount, description, date, category, account fields
  - For "budget": Show form with budget allocations table
  - For "category": Show form with category change fields
- Pre-fill form with current proposal payload
- Validate inputs before allowing save
- On save, call `onSave` with updated payload and close dialog
- Include Cancel button to close without saving

### 5. Update useAssistant Hook

**File**: `frontend/lib/hooks/useAssistant.ts`

- When receiving `MessageResponse`, link proposals to their message using `messageId` from response
- Update `proposals` Map to include `messageId` in proposal data (or maintain separate mapping)
- Ensure `confirmProposal` function works correctly when called from quick action button
- Add helper function to get proposals for a specific message ID

### 6. Update AssistantPanel Component

**File**: `frontend/components/assistant/AssistantPanel.tsx`

- Add state for managing edit dialog: `editingProposal: Proposal | null`
- Pass `onEditProposal` callback to `MessageList` that opens the edit dialog
- Render `ProposalEditDialog` component with controlled open state
- Handle dialog save: call `reviseProposal` then optionally auto-confirm or keep as revised

## Logic Flow

### Quick Action Button Flow

1. **User sends message** → Assistant processes and creates proposal
2. **Backend returns** `MessageResponse` with proposals including `messageId`
3. **Frontend receives response**:
   - Stores message in `messages` array
   - Stores proposals in `proposals` Map, linked by `messageId`
4. **MessageList renders**:
   - For each assistant message, looks up associated proposals by `messageId`
   - Passes proposals to `MessageBubble` component
5. **MessageBubble renders**:
   - Displays message content
   - If proposals exist and are pending/revised, shows quick action buttons
6. **User clicks Confirm**:
   - Calls `onConfirmProposal(proposalId)` directly
   - `useAssistant.confirmProposal()` executes immediately
   - Calls `POST /api/assistant/apply` with proposal ID
   - Updates proposal status to "confirmed"
   - Buttons disappear (proposal no longer pending)
7. **User clicks Edit**:
   - Opens `ProposalEditDialog` with current proposal payload
   - User modifies fields in dialog
   - User clicks Save in dialog
   - Calls `reviseProposal(proposalId, updatedPayload)`
   - Updates proposal with revised payload
   - Dialog closes
   - Quick action buttons remain (proposal still pending, now revised)

### Edit Dialog Flow

1. **Dialog opens** with proposal data
2. **Form pre-fills** with current proposal payload values
3. **User edits** fields (validation happens on blur/change)
4. **User clicks Save**:
   - Validate all required fields
   - If valid: call `onSave(updatedPayload)`
   - Parent component calls `reviseProposal(proposalId, updatedPayload)`
   - Dialog closes
5. **User clicks Cancel** or closes dialog:
   - Discard changes
   - Close dialog without saving

### Proposal Linking Logic

- When `MessageResponse` is received, proposals include `messageId` field
- Store proposals in Map keyed by proposal ID
- Maintain a separate index: `Map<messageId, proposalId[]>` for quick lookup
- When rendering messages, for each assistant message:
  - Look up `messageId` in index
  - Get proposal IDs for that message
  - Fetch proposals from main Map
  - Pass to MessageBubble

## UI/UX Specifications

### Quick Action Buttons

- **Position**: Below message content, inside or attached to message bubble
- **Styling**:
  - Confirm button: Primary style (main color, filled)
  - Edit button: Secondary style (outline, border)
- **Size**: Small/compact buttons, appropriate for chat interface
- **Spacing**: 8-12px gap between buttons, 8px margin-top from message content
- **States**:
  - Default: Visible for pending/revised proposals
  - Loading: Show spinner on Confirm button when applying
  - Disabled: Hide buttons for confirmed/discarded proposals
- **Responsive**: Stack vertically on mobile, horizontal on desktop

### Edit Dialog

- **Size**: Medium dialog (max-width: 500px for transaction, wider for budget)
- **Layout**:
  - Header: "Edit [Proposal Type]" title
  - Body: Form fields appropriate to proposal type
  - Footer: Cancel and Save buttons
- **Form Fields** (for transaction proposal):
  - Amount: Number input with currency formatting
  - Description: Text input
  - Date: Date picker
  - Category: Dropdown/select (populated from user's categories)
  - Account: Dropdown/select (populated from user's accounts)
- **Validation**:
  - Required fields must be filled
  - Amount must be positive number
  - Date must be valid
- **Accessibility**: Proper labels, keyboard navigation, focus management

## Error Handling

- If proposal confirmation fails: Show error message, keep buttons visible
- If edit save fails: Show error in dialog, keep dialog open
- If proposal not found: Hide buttons, log error
- Network errors: Show user-friendly error message, allow retry

## Edge Cases

- Multiple proposals per message: Show buttons for each proposal, or combine into single action
- Proposal already confirmed: Hide buttons, show status indicator
- Proposal discarded: Hide buttons
- Message without proposals: No buttons shown (current behavior)
- Edit dialog with invalid data: Prevent save, show validation errors
- Concurrent edits: Last save wins (or implement optimistic locking)

## Phases

### Phase 1: Backend - Add message_id to Proposals

1. Update `ProposalResponse` schema to include `message_id`
2. Update `AssistantService.process_message()` to include `message_id` in response
3. Update `AssistantRouter` endpoints to include `message_id`
4. Test API response includes `message_id` for proposals

### Phase 2: Frontend - Link Proposals to Messages

1. Update `Proposal` TypeScript interface with `messageId`
2. Update `useAssistant` hook to maintain message-to-proposal mapping
3. Update `MessageList` to group proposals by message
4. Test proposals are correctly linked to messages

### Phase 3: Frontend - Quick Action Buttons

1. Update `MessageBubble` to accept and display proposals
2. Add quick action buttons (Confirm/Edit) to message bubble
3. Wire up Confirm button to `confirmProposal` function
4. Test buttons appear for pending proposals
5. Test Confirm button applies proposal immediately

### Phase 4: Frontend - Edit Dialog

1. Create `ProposalEditDialog` component
2. Implement edit forms for each proposal type (start with transaction)
3. Wire up Edit button to open dialog
4. Implement save functionality
5. Test edit flow end-to-end

### Phase 5: Polish & Testing

1. Add loading states to buttons
2. Add error handling and user feedback
3. Test all proposal types (transaction, budget, category)
4. Test edge cases and error scenarios
5. Ensure responsive design works on mobile
