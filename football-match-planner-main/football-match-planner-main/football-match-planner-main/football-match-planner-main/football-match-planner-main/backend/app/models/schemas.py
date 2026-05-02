from pydantic import BaseModel, Field
from typing import Optional, List, Any

class SubTask(BaseModel):
    name: str
    cost: Optional[Any] = None
    status: Optional[str] = None

class UpdateTaskRequest(BaseModel):
    category_name: str
    task_name: str
    new_status: str
    assigned_to: Optional[str] = None
    assignee_id: Optional[str] = None
    location: Optional[str] = None
    cost: Optional[float] = None
    subtasks: Optional[List[SubTask]] = None
    actor: Optional[str] = None

class Task(BaseModel):
    name: str
    assigned_to: Optional[str] = None
    assignee_id: Optional[str] = None
    status: Optional[str] = "Todo"
    task_type: Optional[str] = "general"   # "logistics" | "personal" | "general"
    location: Optional[str] = None
    cost: Optional[float] = 0
    subtasks: Optional[List[SubTask]] = []

class Category(BaseModel):
    name: str
    tasks: Optional[List[Task]] = []

class MatchCreate(BaseModel):
    name: str
    date: str
    date_end: Optional[str] = None
    status: Optional[str] = "Planned"
    categories: Optional[List[Category]] = []

class UpdateMatchStatusRequest(BaseModel):
    status: str
    actor: Optional[str] = None

class UpdateTreeRequest(BaseModel):
    """Nhận toàn bộ mảng categories sau khi kéo thả để lưu lại thứ tự mới"""
    categories: List[Any]
    actor: Optional[str] = None

class MemberCreate(BaseModel):
    name: str
    username: str
    password: str
    role: Optional[str] = "Member"

class MemberUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str
