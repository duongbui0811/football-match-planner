from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import relationship
from db.postgres import Base

class Member(Base):
    __tablename__ = "members"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True)
    username = Column(String, unique=True, index=True)
    password = Column(String)
    role = Column(String)

class MatchPg(Base):
    __tablename__ = "matches"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    date = Column(String)
    date_end = Column(String)
    status = Column(String)
    created_at = Column(String)
    
    categories = relationship("CategoryPg", back_populates="match", cascade="all, delete-orphan")
    activity_logs = relationship("ActivityLogPg", back_populates="match", cascade="all, delete-orphan")

class CategoryPg(Base):
    __tablename__ = "categories"
    
    id = Column(String, primary_key=True, index=True)
    match_id = Column(String, ForeignKey("matches.id", ondelete="CASCADE"))
    name = Column(String)
    
    match = relationship("MatchPg", back_populates="categories")
    tasks = relationship("TaskPg", back_populates="category", cascade="all, delete-orphan")

class TaskPg(Base):
    __tablename__ = "tasks"
    
    id = Column(String, primary_key=True, index=True)
    category_id = Column(String, ForeignKey("categories.id", ondelete="CASCADE"))
    name = Column(String)
    status = Column(String)
    task_type = Column(String)
    location = Column(String, nullable=True)
    cost = Column(Integer, nullable=True)
    assigned_to = Column(String, nullable=True)
    assignee_id = Column(String, nullable=True)
    
    category = relationship("CategoryPg", back_populates="tasks")
    subtasks = relationship("SubtaskPg", back_populates="task", cascade="all, delete-orphan")

class SubtaskPg(Base):
    __tablename__ = "subtasks"
    
    id = Column(String, primary_key=True, index=True)
    task_id = Column(String, ForeignKey("tasks.id", ondelete="CASCADE"))
    name = Column(String)
    cost = Column(Integer, nullable=True)
    status = Column(String)
    
    task = relationship("TaskPg", back_populates="subtasks")

class ActivityLogPg(Base):
    __tablename__ = "activity_logs"
    
    id = Column(String, primary_key=True, index=True)
    match_id = Column(String, ForeignKey("matches.id", ondelete="CASCADE"))
    action = Column(String)
    timestamp = Column(String)
    actor = Column(String)
    
    match = relationship("MatchPg", back_populates="activity_logs")
