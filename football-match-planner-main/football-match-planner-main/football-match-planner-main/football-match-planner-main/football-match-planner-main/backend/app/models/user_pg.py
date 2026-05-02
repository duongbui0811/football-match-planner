from sqlalchemy import Column, String
from app.db.postgres import Base

class Member(Base):
    __tablename__ = "members"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True)
    username = Column(String, unique=True, index=True)
    password = Column(String)
    role = Column(String)
