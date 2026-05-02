from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from db.postgres import get_pg_db
from models.user_pg import Member
from models.schemas import MemberCreate, MemberUpdate, LoginRequest
import uuid
import hashlib

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

router = APIRouter()

@router.get("/")
def list_members(db: Session = Depends(get_pg_db)):
    # Insert default admin if no members exist
    if db.query(Member).count() == 0:
        admin_doc = Member(
            id=f"mem_{uuid.uuid4().hex[:8]}",
            name="User",
            username="user",
            password=hash_password("123"),
            role="Admin"
        )
        db.add(admin_doc)
        db.commit()

    members = db.query(Member).all()
    results = []
    for m in members:
        results.append({
            "id": m.id,
            "name": m.name,
            "username": m.username,
            "role": m.role
        })
    return {"data": results, "total": len(results)}

@router.post("/")
def create_member(payload: MemberCreate, db: Session = Depends(get_pg_db)):
    if db.query(Member).filter(Member.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")

    new_id = f"mem_{uuid.uuid4().hex[:8]}"
    role = payload.role if payload.role in ["Admin", "Member"] else "Member"
    
    new_member = Member(
        id=new_id,
        name=payload.name,
        username=payload.username,
        password=hash_password(payload.password),
        role=role
    )
    
    db.add(new_member)
    db.commit()
    db.refresh(new_member)
    
    return {"message": "Member created", "data": {
        "id": new_member.id,
        "name": new_member.name,
        "username": new_member.username,
        "role": new_member.role
    }}

@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_pg_db)):
    user = db.query(Member).filter(Member.username == payload.username).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    if user.password != hash_password(payload.password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    return {
        "id": user.id,
        "username": user.username,
        "name": user.name,
        "role": user.role
    }

@router.delete("/{member_id}")
def delete_member(member_id: str, db: Session = Depends(get_pg_db)):
    user = db.query(Member).filter(Member.id == member_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Member not found")
        
    if user.username == "admin":
        raise HTTPException(status_code=400, detail="Không thể xóa tài khoản admin gốc")
        
    db.delete(user)
    db.commit()
    return {"message": "Member deleted successfully"}
