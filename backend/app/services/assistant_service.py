"""
Assistant Service - Orchestrates LLM interactions and tool execution.
"""

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.models.assistant import Conversation, ConversationMessage, ActionProposal
from app.services.llm_client import get_llm_client, LLMClient, LLMResponse
from app.tools.registry import get_tool_registry, ToolRegistry


class AssistantService:
    """
    Orchestrates the Dompy Assistant conversation flow.

    Handles:
    - Conversation and message management
    - LLM interaction with tool calling
    - Read tool auto-execution
    - Proposal generation from write tools
    - Proposal application on confirmation
    """

    def __init__(self, db: Session, user_id: str):
        self.db = db
        self.user_id = user_id
        self.tool_registry = get_tool_registry()
        self._llm_client: LLMClient | None = None

    @property
    def llm_client(self) -> LLMClient:
        """Lazy-load LLM client."""
        if self._llm_client is None:
            self._llm_client = get_llm_client()
        return self._llm_client

    # =========================================================================
    # Conversation Management
    # =========================================================================

    def get_or_create_conversation(
        self, conversation_id: str | None = None
    ) -> Conversation:
        """Get existing conversation or create a new one."""
        if conversation_id:
            try:
                conv_uuid = uuid.UUID(conversation_id)
                conversation = (
                    self.db.query(Conversation)
                    .filter(
                        Conversation.id == conv_uuid,
                        Conversation.user_id == self.user_id,
                    )
                    .first()
                )
                if conversation:
                    return conversation
            except (ValueError, TypeError):
                # Invalid UUID format, create new conversation
                pass

        # Create new conversation
        conversation = Conversation(
            user_id=self.user_id,
            title=None,  # Will be set after first exchange
        )
        self.db.add(conversation)
        self.db.flush()
        return conversation

    def get_conversation(self, conversation_id: str) -> Conversation | None:
        """Get a conversation by ID."""
        try:
            conv_uuid = uuid.UUID(conversation_id)
            return (
                self.db.query(Conversation)
                .filter(
                    Conversation.id == conv_uuid,
                    Conversation.user_id == self.user_id,
                )
                .first()
            )
        except (ValueError, TypeError):
            return None

    def get_conversations(
        self, skip: int = 0, limit: int = 20
    ) -> tuple[list[Conversation], int]:
        """Get user's conversations with pagination."""
        query = (
            self.db.query(Conversation)
            .filter(Conversation.user_id == self.user_id)
            .order_by(Conversation.updated_at.desc())
        )
        total = query.count()
        conversations = query.offset(skip).limit(limit).all()
        return conversations, total

    def delete_conversation(self, conversation_id: str) -> bool:
        """Delete a conversation and all associated data."""
        conversation = self.get_conversation(conversation_id)
        if not conversation:
            return False

        self.db.delete(conversation)
        self.db.commit()
        return True

    # =========================================================================
    # Message Processing
    # =========================================================================

    def process_message(
        self,
        message: str,
        conversation_id: str | None = None,
        image_url: str | None = None,
    ) -> dict[str, Any]:
        """
        Process a user message and return assistant response.

        Args:
            message: User's message text
            conversation_id: Optional existing conversation ID
            image_url: Optional image attachment

        Returns:
            Dict with conversation_id, message_id, content, tool_calls, proposals
        """
        # Get or create conversation
        conversation = self.get_or_create_conversation(conversation_id)

        # Store user message
        user_message = ConversationMessage(
            conversation_id=conversation.id,
            role="user",
            content=message,
            image_url=image_url,
        )
        self.db.add(user_message)
        self.db.flush()

        # Build context
        context = self._build_context(conversation)

        # Build messages for LLM
        messages = self._build_llm_messages(conversation, context)

        # Get tool definitions
        tool_definitions = self.tool_registry.get_openai_tools()

        # Process with LLM (may involve multiple rounds for tool execution)
        final_response, executed_tools, proposals = self._process_with_tools(
            messages, tool_definitions, conversation
        )

        # Store assistant message
        assistant_message = ConversationMessage(
            conversation_id=conversation.id,
            role="assistant",
            content=final_response.content,
            tool_calls=self._serialize_tool_calls(executed_tools),
        )
        self.db.add(assistant_message)
        self.db.flush()

        # Store proposals
        stored_proposals = []
        for proposal_data in proposals:
            proposal = ActionProposal(
                conversation_id=conversation.id,
                message_id=assistant_message.id,
                proposal_type=proposal_data["proposal_type"],
                status="pending",
                original_payload=proposal_data["payload"],
            )
            self.db.add(proposal)
            self.db.flush()
            stored_proposals.append(proposal)

        # Update conversation timestamp and title
        conversation.updated_at = datetime.now(timezone.utc)
        if not conversation.title:
            conversation.title = self._generate_title(message)

        self.db.commit()

        # Build response
        return {
            "conversation_id": str(conversation.id),
            "message_id": str(assistant_message.id),
            "content": final_response.content or "",
            "tool_calls": [
                {"id": tc["id"], "tool_name": tc["name"], "arguments": tc["arguments"]}
                for tc in executed_tools
            ],
            "proposals": [
                {
                    "id": str(p.id),
                    "proposal_type": p.proposal_type,
                    "status": p.status,
                    "payload": p.original_payload,
                    "original_payload": p.original_payload,
                    "revised_payload": p.revised_payload,
                    "applied_at": p.applied_at,
                    "result_id": p.result_id,
                    "created_at": p.created_at.isoformat(),
                }
                for p in stored_proposals
            ],
        }

    def _build_context(self, conversation: Conversation) -> dict[str, Any]:
        """Build context data for the conversation."""
        # Get accounts
        from app.tools.read.get_accounts import GetAccountsTool

        accounts_tool = GetAccountsTool()
        accounts_result = accounts_tool.execute({}, self.db, self.user_id)
        accounts = (
            accounts_result.data.get("accounts", []) if accounts_result.data else []
        )

        # Get categories
        from app.tools.read.get_categories import GetCategoriesTool

        categories_tool = GetCategoriesTool()
        categories_result = categories_tool.execute({}, self.db, self.user_id)
        categories = categories_result.data if categories_result.data else {}

        return {
            "accounts": accounts,
            "categories": categories,
            "current_date": datetime.now().strftime("%Y-%m-%d"),
        }

    def _build_llm_messages(
        self, conversation: Conversation, context: dict[str, Any]
    ) -> list[dict[str, Any]]:
        """Build message list for LLM including system prompt and history."""
        messages = []

        # System prompt
        system_prompt = self.llm_client.build_system_prompt(
            current_date=context["current_date"],
            accounts=context["accounts"],
            categories=context["categories"],
        )
        messages.append({"role": "system", "content": system_prompt})

        # Conversation history (last N messages)
        history = (
            self.db.query(ConversationMessage)
            .filter(ConversationMessage.conversation_id == conversation.id)
            .order_by(ConversationMessage.created_at)
            .limit(20)  # Limit history to last 20 messages
            .all()
        )

        for msg in history:
            if msg.role == "user":
                messages.append({"role": "user", "content": msg.content or ""})
            elif msg.role == "assistant":
                messages.append({"role": "assistant", "content": msg.content or ""})
            elif msg.role == "tool":
                # Include tool results in history
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": msg.tool_call_id,
                        "content": msg.content or "",
                    }
                )

        return messages

    def _process_with_tools(
        self,
        messages: list[dict[str, Any]],
        tool_definitions: list[dict[str, Any]],
        conversation: Conversation,
    ) -> tuple[LLMResponse, list[dict[str, Any]], list[dict[str, Any]]]:
        """
        Process message with tool execution loop.

        Returns:
            Tuple of (final_response, executed_tools, proposals)
        """
        executed_tools = []
        proposals = []
        max_iterations = 5  # Prevent infinite loops

        for _ in range(max_iterations):
            # Call LLM
            response = self.llm_client.chat_completion(
                messages=messages,
                tools=tool_definitions,
            )

            # If no tool calls, we're done
            if not response.tool_calls:
                return response, executed_tools, proposals

            # Process each tool call
            for tool_call in response.tool_calls:
                tool_name = tool_call.name
                tool_args = tool_call.arguments

                # Track executed tool
                executed_tools.append(
                    {
                        "id": tool_call.id,
                        "name": tool_name,
                        "arguments": tool_args,
                    }
                )

                # Execute tool
                result = self.tool_registry.execute(
                    tool_name, tool_args, self.db, self.user_id
                )

                # Store tool message
                tool_message = ConversationMessage(
                    conversation_id=conversation.id,
                    role="tool",
                    content=str(result.to_dict()),
                    tool_call_id=tool_call.id,
                    tool_name=tool_name,
                )
                self.db.add(tool_message)

                # Collect proposals from write tools
                if result.proposals:
                    proposals.extend(result.proposals)

                # Add tool result to messages for next LLM call
                # First, add the assistant message with tool calls
                messages.append(
                    {
                        "role": "assistant",
                        "tool_calls": [
                            {
                                "id": tool_call.id,
                                "type": "function",
                                "function": {
                                    "name": tool_name,
                                    "arguments": str(tool_args),
                                },
                            }
                        ],
                    }
                )

                # Then add the tool result
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": str(result.to_dict()),
                    }
                )

        # If we hit max iterations, return last response
        return response, executed_tools, proposals

    def _serialize_tool_calls(
        self, tool_calls: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        """Serialize tool calls for storage."""
        return tool_calls

    def _generate_title(self, message: str) -> str:
        """Generate a conversation title from the first message."""
        # Simple: take first 50 chars
        title = message[:50].strip()
        if len(message) > 50:
            title += "..."
        return title

    # =========================================================================
    # Proposal Management
    # =========================================================================

    def get_proposal(self, proposal_id: str) -> ActionProposal | None:
        """Get a proposal by ID, verifying ownership via conversation."""
        try:
            prop_uuid = uuid.UUID(proposal_id)
            return (
                self.db.query(ActionProposal)
                .join(Conversation)
                .filter(
                    ActionProposal.id == prop_uuid,
                    Conversation.user_id == self.user_id,
                )
                .first()
            )
        except (ValueError, TypeError):
            return None

    def update_proposal(
        self,
        proposal_id: str,
        revised_payload: dict[str, Any] | None = None,
        status: str | None = None,
    ) -> ActionProposal | None:
        """Update a proposal's payload or status."""
        proposal = self.get_proposal(proposal_id)
        if not proposal:
            return None

        if revised_payload is not None:
            proposal.revised_payload = revised_payload
            if status is None:
                proposal.status = "revised"

        if status is not None:
            proposal.status = status

        self.db.commit()
        return proposal

    def apply_proposals(
        self,
        proposal_ids: list[str],
        revisions: dict[str, dict[str, Any]] | None = None,
    ) -> list[dict[str, Any]]:
        """
        Apply one or more confirmed proposals.

        Args:
            proposal_ids: List of proposal IDs to apply
            revisions: Optional dict of proposal_id -> revised_payload

        Returns:
            List of results with success status per proposal
        """
        results = []
        revisions = revisions or {}

        for proposal_id in proposal_ids:
            proposal = self.get_proposal(proposal_id)

            if not proposal:
                results.append(
                    {
                        "proposal_id": proposal_id,
                        "success": False,
                        "entity_id": None,
                        "error": "Proposal not found",
                    }
                )
                continue

            if proposal.status == "confirmed":
                results.append(
                    {
                        "proposal_id": proposal_id,
                        "success": False,
                        "entity_id": proposal.result_id,
                        "error": "Proposal already applied",
                    }
                )
                continue

            if proposal.status == "discarded":
                results.append(
                    {
                        "proposal_id": proposal_id,
                        "success": False,
                        "entity_id": None,
                        "error": "Proposal was discarded",
                    }
                )
                continue

            # Apply revision if provided
            if proposal_id in revisions:
                proposal.revised_payload = revisions[proposal_id]

            # Get effective payload
            payload = proposal.revised_payload or proposal.original_payload

            # Get apply tool
            apply_tool_name = self.tool_registry.get_apply_tool_for_proposal(
                proposal.proposal_type
            )

            if not apply_tool_name:
                results.append(
                    {
                        "proposal_id": proposal_id,
                        "success": False,
                        "entity_id": None,
                        "error": f"No apply tool for type: {proposal.proposal_type}",
                    }
                )
                continue

            # Execute apply tool
            result = self.tool_registry.execute(
                apply_tool_name, payload, self.db, self.user_id
            )

            if result.is_error:
                results.append(
                    {
                        "proposal_id": proposal_id,
                        "success": False,
                        "entity_id": None,
                        "error": result.error_message,
                    }
                )
                continue

            # Update proposal status
            proposal.status = "confirmed"
            proposal.applied_at = datetime.now(timezone.utc)

            # Extract entity ID from result
            entity_id = None
            if result.data:
                entity_id = (
                    result.data.get("transaction_id")
                    or result.data.get("category_id")
                    or str(result.data.get("budget_ids", [""])[0])
                )
            proposal.result_id = entity_id

            results.append(
                {
                    "proposal_id": proposal_id,
                    "success": True,
                    "entity_id": entity_id,
                    "error": None,
                }
            )

        self.db.commit()
        return results
