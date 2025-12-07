# Testing the Dompy AI Assistant

This guide explains how to test the AI assistant feature in the Dompy Finance app.

## Prerequisites

1. **OpenAI API Key**: You need a valid OpenAI API key to use the assistant

   - Get one from: https://platform.openai.com/api-keys
   - The assistant uses GPT-4o model by default

2. **Running Application**: Both backend and frontend should be running

   - Backend: `http://localhost:8000`
   - Frontend: `http://localhost:3000`

3. **User Account**: You need to be signed in with a Clerk account

## Setup

### 1. Configure OpenAI API Key

#### Option A: Environment Variable (Recommended)

Create a `.env` file in the `backend/` directory:

```bash
cd backend
cat > .env << EOF
OPENAI_API_KEY=sk-your-openai-api-key-here
ASSISTANT_MODEL=gpt-4o
EOF
```

#### Option B: Direct Configuration

The key can also be set directly in `backend/app/config.py`, but using environment variables is preferred for security.

### 2. Verify Configuration

Check that the backend can access the API key:

```bash
cd backend
python -c "from app.config import settings; print('OpenAI configured:', settings.has_openai_key)"
```

Should output: `OpenAI configured: True`

### 3. Restart Backend

If you added the API key after starting the backend, restart it:

```bash
# Stop the current backend (Ctrl+C)
# Then restart:
cd backend
uvicorn app.main:app --reload --port 8000
```

## Accessing the Assistant

1. **Sign in** to the app at `http://localhost:3000`
2. **Look for the floating button** in the bottom-right corner (MessageCircle icon)
3. **Click the button** to open the assistant panel
4. The assistant panel will slide in from the right side

## Testing Scenarios

### 1. Basic Conversation

**Test**: Simple greeting and questions

```
You: "Hello, what can you help me with?"
Assistant: Should respond with capabilities

You: "What are my accounts?"
Assistant: Should call get_accounts tool and show your accounts
```

### 2. Read Operations (Auto-executed)

These tools execute automatically without confirmation:

#### Get Accounts

```
You: "Show me all my accounts"
You: "What accounts do I have?"
```

#### Get Transactions

```
You: "Show me my recent transactions"
You: "What transactions did I make this month?"
You: "Show transactions from last week"
```

#### Get Budget Overview

```
You: "What's my budget for this month?"
You: "Show me my budget overview"
```

#### Get Cashflow Summary

```
You: "What's my cashflow this month?"
You: "Show me income and expenses for this week"
```

### 3. Write Operations (Require Confirmation)

These create proposals that you must confirm:

#### Add Transaction

```
You: "Add a transaction: Coffee shop, 50000, today, Food category"
You: "I spent 100000 on groceries yesterday"
You: "Record a payment of 200000 to Rent category"
```

**Expected Behavior**:

- Assistant creates a proposal card
- Card shows: date, amount, category, account, description
- You can edit the fields before confirming
- Click "Confirm" to apply, or "Discard" to cancel

#### Create Budget Plan

```
You: "Create a budget plan for 5000000 income this month"
You: "Help me plan a budget with 10% savings"
You: "I make 8000000 per month, create a budget"
```

**Expected Behavior**:

- Assistant proposes budget allocations across categories
- Shows table with suggested amounts per category
- You can edit amounts before confirming

#### Category Changes

```
You: "Create a new category called 'Entertainment'"
You: "Rename 'Food' to 'Groceries'"
You: "Merge 'Coffee' into 'Food' category"
```

**Expected Behavior**:

- Assistant shows proposal with the changes
- You can review and confirm or discard

### 4. Complex Queries

```
You: "What did I spend on food this month?"
# Should call get_transactions with category filter

You: "How much do I have left in my food budget?"
# Should call get_budget_overview and calculate remaining

You: "Add a transaction for lunch today, 75000, and then show my updated budget"
# Should propose transaction, then after confirmation, show updated budget
```

### 5. Error Handling

Test error scenarios:

```
You: "Add a transaction" (missing details)
# Should ask for clarification

You: "Show transactions from invalid date"
# Should handle gracefully

You: "Add transaction with invalid category"
# Should show error or ask to create category
```

## Testing Checklist

- [ ] Assistant panel opens when clicking floating button
- [ ] Can send messages and receive responses
- [ ] Read tools execute automatically (no confirmation needed)
- [ ] Write tools create proposal cards
- [ ] Can edit proposal fields before confirming
- [ ] Can confirm proposals (applies to database)
- [ ] Can discard proposals
- [ ] Tool indicators show which tools were used
- [ ] Error messages display properly
- [ ] Loading states work correctly
- [ ] Conversation history persists (refresh page, conversation should remain)

## API Testing (Direct)

You can also test the API directly using the Swagger UI:

1. Go to `http://localhost:8000/docs`
2. Find the `/api/assistant/message` endpoint
3. Click "Try it out"
4. You'll need to authenticate first (click "Authorize" button)
5. Send a test message:

```json
{
  "message": "What are my accounts?",
  "conversation_id": null
}
```

## Troubleshooting

### Assistant doesn't respond

1. **Check OpenAI API Key**:

   ```bash
   cd backend
   python -c "from app.config import settings; print(settings.OPENAI_API_KEY[:10] if settings.OPENAI_API_KEY else 'NOT SET')"
   ```

2. **Check Backend Logs**: Look for errors in the terminal running the backend

3. **Check API Key Validity**: Test with a simple curl:
   ```bash
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer YOUR_API_KEY"
   ```

### Proposals not showing

1. Check browser console for errors
2. Verify backend is returning proposals in the response
3. Check that you have accounts/categories set up (needed for transaction proposals)

### Authentication errors

1. Make sure you're signed in via Clerk
2. Check that `CLERK_SECRET_KEY` is set in backend
3. Verify JWT token is being sent in requests (check browser Network tab)

### Tool execution errors

1. Check backend logs for specific error messages
2. Verify database is accessible
3. Ensure you have test data (accounts, categories) set up

## Example Test Session

Here's a complete test session you can try:

```
1. Open assistant panel
2. Send: "Hello"
3. Send: "What accounts do I have?"
4. Send: "Add a transaction: Coffee, 50000, today, Food"
5. Review the proposal card
6. Edit amount to 75000
7. Click Confirm
8. Send: "Show me my recent transactions"
9. Verify the new transaction appears
10. Send: "What's my budget for this month?"
```

## Performance Notes

- First message may take 2-5 seconds (LLM initialization)
- Read tools execute quickly (< 1 second)
- Write tools may take 3-10 seconds (LLM processing + proposal creation)
- Multiple tool calls in sequence will take longer

## Cost Considerations

- GPT-4o is used by default (more expensive but better quality)
- Each message with tool calls uses tokens
- Read tools are free (just database queries)
- Write tools that create proposals use LLM tokens
- Monitor your OpenAI usage at: https://platform.openai.com/usage

## Next Steps

After basic testing works:

- Test with image uploads (receipt OCR)
- Test conversation history persistence
- Test multiple conversations
- Test error recovery
- Test with real financial data
