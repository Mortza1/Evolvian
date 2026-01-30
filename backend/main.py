from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


from routers import auth, teams, agents, chat, operations, evo, knowledge_graph, tools, marketplace, assumptions, user_preferences
from database import engine, Base


# Create all database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Evolvian API", version="1.0.0")

# CORS middleware - allows frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001"
    ],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
    expose_headers=["Set-Cookie"],
    max_age=3600,
)

@app.get("/")
def read_root():
    """Health check endpoint"""
    return {"status": "ok", "message": "Evolvian API is running"}

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(teams.router, prefix="/api/teams", tags=["Teams"])
app.include_router(agents.router, prefix="/api/agents", tags=["Agents"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(operations.router, prefix="/api/operations", tags=["Operations"])
app.include_router(evo.router, prefix="/api/evo", tags=["Evo"])
app.include_router(knowledge_graph.router, prefix="/api/knowledge", tags=["Knowledge Graph"])
app.include_router(tools.router, prefix="/api/tools", tags=["Tools"])
app.include_router(marketplace.router, prefix="/api/marketplace", tags=["Marketplace"])
app.include_router(assumptions.router, prefix="/api/assumptions", tags=["Assumptions"])
app.include_router(user_preferences.router, prefix="/api/user/preferences", tags=["User Preferences"])




if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
