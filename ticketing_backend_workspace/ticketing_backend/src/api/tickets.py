import os
import uuid
import json
from typing import List, Optional
from enum import Enum
from datetime import datetime

from fastapi import APIRouter, HTTPException, status, Body
from pydantic import BaseModel, Field

# ===== Storage Utilities =====


TICKETS_FILE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../tickets_data.json")


def _read_tickets():
    if not os.path.exists(TICKETS_FILE_PATH):
        return []
    with open(TICKETS_FILE_PATH, "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except Exception:
            return []


def _write_tickets(tickets):
    with open(TICKETS_FILE_PATH, "w", encoding="utf-8") as f:
        json.dump(tickets, f, indent=2)


def _find_ticket(ticket_id: str):
    tickets = _read_tickets()
    for ticket in tickets:
        if ticket["id"] == ticket_id:
            return ticket    return None


def _update_ticket(ticket_id: str, update_fields: dict):
    tickets = _read_tickets()
    found = False
    for ticket in tickets:
        if ticket["id"] == ticket_id:
            ticket.update(update_fields)
            found = True
            break
    if found:
        _write_tickets(tickets)
    return found


# ===== Ticket Model =====


class TicketStatus(str, Enum):
    open = "open"
    in_progress = "in_progress"
    closed = "closed"


class TicketBase(BaseModel):
    title: str = Field(
        ...,
        description="Short summary of the ticket"
    )
    description: str = Field(
        ...,
        description="Detailed description of the issue"
    )


class TicketCreate(TicketBase):
    pass


class TicketUpdate(BaseModel):
    title: Optional[str] = Field(
        None,
        description="Updated title"
    )
    description: Optional[str] = Field(
        None,
        description="Updated description"
    )
    status: Optional[TicketStatus] = Field(
        None,
        description="Ticket status to set"
    )


class Ticket(TicketBase):
    id: str = Field(
        ...,
        description="Ticket ID"
    )
    status: TicketStatus = Field(
        ...,
        description="Current ticket status"
    )
    created_at: str = Field(
        ...,
        description="Ticket creation ISO timestamp"
    )
    updated_at: str = Field(
        ...,
        description="Last updated ISO timestamp"
    )


# ===== API Router =====


router = APIRouter(
    prefix="/tickets",
    tags=["Tickets"],
    responses={404: {"description": "Ticket not found"}},
)


def now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


# PUBLIC_INTERFACE
@router.post(
    "/",
    response_model=Ticket,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new ticket",
    description="Submit an anonymous support ticket.",
)
def create_ticket(ticket: TicketCreate):
    """Creates a new ticket with the given title and description."""
    new_ticket = {
        "id": str(uuid.uuid4()),
        "title": ticket.title,
        "description": ticket.description,
        "status": TicketStatus.open,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    tickets = _read_tickets()
    tickets.append(new_ticket)
    _write_tickets(tickets)
    return new_ticket


# PUBLIC_INTERFACE
@router.get(
    "/{ticket_id}",
    response_model=Ticket,
    summary="View a ticket",
    description="Get the full details of a support ticket by its ID.",
)
def get_ticket(ticket_id: str):
    """Retrieves a specific ticket by ID."""
    ticket = _find_ticket(ticket_id)
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found",
        )
    return ticket

# PUBLIC_INTERFACE
@router.get(
    "/",
    response_model=List[Ticket],
    summary="List all tickets",
    description="List all support tickets (in order of newest first).",
)
def list_tickets():
    """Returns the list of all tickets, sorted by newest first."""
    tickets = _read_tickets()
    return sorted(tickets, key=lambda x: x.get("created_at", ""), reverse=True)


# PUBLIC_INTERFACE
@router.patch(
    "/{ticket_id}",
    response_model=Ticket,
    summary="Update a ticket",
    description="Update title, description or status of an existing ticket.",
)
def update_ticket(ticket_id: str, updates: TicketUpdate = Body(...)):
    """Updates ticket fields if the ticket exists."""
    ticket = _find_ticket(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    changes = updates.dict(exclude_unset=True)
    if not changes:
        raise HTTPException(status_code=400, detail="No update fields provided")
    changes["updated_at"] = now_iso()
    _update_ticket(ticket_id, changes)
    ticket.update(changes)
    return ticket

# PUBLIC_INTERFACE
@router.post(
    "/{ticket_id}/close",
    response_model=Ticket,
    summary="Close a ticket",
    description="Set the status of a ticket to closed.",
)
def close_ticket(ticket_id: str):
    """Closes a ticket, setting its status to closed."""
    ticket = _find_ticket(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket["status"] == TicketStatus.closed:
        raise HTTPException(status_code=400, detail="Ticket is already closed")
    changes = {
        "status": TicketStatus.closed,
        "updated_at": now_iso(),
    }
    _update_ticket(ticket_id, changes)
    ticket.update(changes)
    return ticket
