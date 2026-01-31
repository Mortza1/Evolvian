from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


from routers import auth, teams, agents, chat, operations, evo, knowledge, tools, marketplace, assumptions, users, vault
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

app.include_router(auth.router)
app.include_router(teams.router)
app.include_router(agents.router)
app.include_router(chat.router)
app.include_router(operations.router)
app.include_router(evo.router)
app.include_router(knowledge.router)
app.include_router(tools.router)
app.include_router(marketplace.router)
app.include_router(assumptions.router)
app.include_router(users.router)
app.include_router(vault.router)




if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
