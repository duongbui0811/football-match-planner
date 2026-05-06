from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker

PG_URI = "postgresql://postgres:1@localhost:5432/football_planner"

engine = create_engine(PG_URI, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_pg_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
