"""
Assistant API routes.

Provides endpoints for the Dompy Assistant chat interface.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user
from app.services.assistant_service import AssistantService
from app.schemas.assistant import (
    MessageRequest,
    MessageResponse,
    ProposalResponse,
    ProposalUpdate,
    ApplyRequest,
    ApplyResponse,
    ApplyResultItem,
    ConversationSummary,
    ConversationDetail,
    ConversationListResponse,
    MessageBase,
    ToolCallInfo,
)

router = APIRouter()


def get_assistant_service(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
) -> AssistantService:
    """Dependency to get AssistantService instance."""
    return AssistantService(db, user_id)


# =============================================================================
# Message Endpoints
# =============================================================================


@router.post("/message", response_model=MessageResponse)
def send_message(
    request: MessageRequest,
    service: AssistantService = Depends(get_assistant_service),
):
    """
    Send a message to the Dompy Assistant.

    The assistant will:
    1. Process the message with context
    2. Execute any read tools automatically
    3. Generate proposals for write operations
    4. Return response with any proposals

    Proposals require separate confirmation via /apply endpoint.
    """
    try:
        result = service.process_message(
            message=request.message,
            conversation_id=str(request.conversation_id) if request.conversation_id else None,
            image_url=request.image_url,
        )

        return MessageResponse(
            conversation_id=UUID(result["conversation_id"]),
            message_id=UUID(result["message_id"]),
            content=result["content"],
            tool_calls=[
                ToolCallInfo(
                    id=tc["id"],
                    tool_name=tc["tool_name"],
                    arguments=tc["arguments"],
                )
                for tc in result["tool_calls"]
            ],
            proposals=[
                ProposalResponse(
                    id=UUID(p["id"]),
                    proposal_type=p["proposal_type"],
                    status=p["status"],
                    payload=p["payload"],
                    original_payload=p["original_payload"],
                    revised_payload=p["revised_payload"],
                    applied_at=p["applied_at"],
                    result_id=p["result_id"],
                    created_at=p["created_at"],
                )
                for p in result["proposals"]
            ],
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process message: {str(e)}",
        )


# =============================================================================
# Proposal Endpoints
# =============================================================================


@router.post("/apply", response_model=ApplyResponse)
def apply_proposals(
    request: ApplyRequest,
    service: AssistantService = Depends(get_assistant_service),
):
    """
    Apply one or more confirmed proposals.

    Each proposal will be executed and the result returned.
    Optionally include revisions to update proposals before applying.
    """
    try:
        # Convert UUID keys to strings for revisions
        revisions = None
        if request.revisions:
            revisions = {str(k): v for k, v in request.revisions.items()}

        results = service.apply_proposals(
            proposal_ids=[str(pid) for pid in request.proposal_ids],
            revisions=revisions,
        )

        return ApplyResponse(
            results=[
                ApplyResultItem(
                    proposal_id=UUID(r["proposal_id"]),
                    success=r["success"],
                    entity_id=r["entity_id"],
                    error=r["error"],
                )
                for r in results
            ]
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to apply proposals: {str(e)}",
        )


@router.patch("/proposals/{proposal_id}", response_model=ProposalResponse)
def update_proposal(
    proposal_id: UUID,
    update: ProposalUpdate,
    service: AssistantService = Depends(get_assistant_service),
):
    """
    Update a proposal's payload or status.

    Use this to revise a proposal before confirming, or to discard it.
    """
    proposal = service.update_proposal(
        proposal_id=str(proposal_id),
        revised_payload=update.revised_payload,
        status=update.status,
    )

    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proposal not found",
        )

    return ProposalResponse(
        id=proposal.id,
        proposal_type=proposal.proposal_type,
        status=proposal.status,
        payload=proposal.effective_payload,
        original_payload=proposal.original_payload,
        revised_payload=proposal.revised_payload,
        applied_at=proposal.applied_at,
        result_id=proposal.result_id,
        created_at=proposal.created_at,
    )


@router.get("/proposals/{proposal_id}", response_model=ProposalResponse)
def get_proposal(
    proposal_id: UUID,
    service: AssistantService = Depends(get_assistant_service),
):
    """Get a single proposal by ID."""
    proposal = service.get_proposal(str(proposal_id))

    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proposal not found",
        )

    return ProposalResponse(
        id=proposal.id,
        proposal_type=proposal.proposal_type,
        status=proposal.status,
        payload=proposal.effective_payload,
        original_payload=proposal.original_payload,
        revised_payload=proposal.revised_payload,
        applied_at=proposal.applied_at,
        result_id=proposal.result_id,
        created_at=proposal.created_at,
    )


# =============================================================================
# Conversation Endpoints
# =============================================================================


@router.get("/conversations", response_model=ConversationListResponse)
def list_conversations(
    skip: int = 0,
    limit: int = 20,
    service: AssistantService = Depends(get_assistant_service),
):
    """Get user's conversations with pagination."""
    conversations, total = service.get_conversations(skip=skip, limit=limit)

    return ConversationListResponse(
        conversations=[
            ConversationSummary(
                id=c.id,
                title=c.title,
                created_at=c.created_at,
                updated_at=c.updated_at,
                message_count=len(c.messages),
            )
            for c in conversations
        ],
        total=total,
        has_more=(skip + limit) < total,
    )


@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
def get_conversation(
    conversation_id: UUID,
    service: AssistantService = Depends(get_assistant_service),
):
    """Get a conversation with all messages and proposals."""
    conversation = service.get_conversation(str(conversation_id))

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    return ConversationDetail(
        id=conversation.id,
        title=conversation.title,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        messages=[
            MessageBase(
                id=m.id,
                role=m.role,
                content=m.content,
                image_url=m.image_url,
                tool_calls=[
                    ToolCallInfo(**tc) for tc in (m.tool_calls or [])
                ] if m.tool_calls else None,
                tool_call_id=m.tool_call_id,
                tool_name=m.tool_name,
                created_at=m.created_at,
            )
            for m in conversation.messages
        ],
        proposals=[
            ProposalResponse(
                id=p.id,
                proposal_type=p.proposal_type,
                status=p.status,
                payload=p.effective_payload,
                original_payload=p.original_payload,
                revised_payload=p.revised_payload,
                applied_at=p.applied_at,
                result_id=p.result_id,
                created_at=p.created_at,
            )
            for p in conversation.proposals
        ],
    )


@router.delete("/conversations/{conversation_id}")
def delete_conversation(
    conversation_id: UUID,
    service: AssistantService = Depends(get_assistant_service),
):
    """Delete a conversation and all associated data."""
    success = service.delete_conversation(str(conversation_id))

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    return {"message": "Conversation deleted"}


