from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

# SQLite database
SQLALCHEMY_DATABASE_URL = "sqlite:///./evolvian.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    # NullPool: no connection pooling — each session gets a fresh connection
    # that is closed immediately on session.close(). This eliminates the
    # QueuePool exhaustion caused by long-lived SSE streams holding connections.
    poolclass=NullPool,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
