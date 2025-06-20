from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .tickets import router as tickets_router

# PUBLIC_INTERFACE
app = FastAPI(
    title="Anonymous Ticketing System API",
    description=(
        "Backend API for anonymous support ticket management "
        "(create, view, list, update, close)."
    ),
    version="1.0.0",
    openapi_tags=[
        {"name": "Tickets", "description": "Ticket management endpoints"},
    ],
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["Utility"])
def health_check():
    """Health check endpoint for backend."""
    return {"message": "Healthy"}


app.include_router(tickets_router)
