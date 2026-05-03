import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from api import matches, members
from db.postgres import engine, Base
import models.user_pg  # Import to register models

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Football Match Planner API",
    description="Nền tảng Quản lý Tổ chức Trận đấu & Đội bóng — 1 query duy nhất, nested document MongoDB",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware ,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Tìm thư mục frontend
_possible = [
    os.path.join(os.path.dirname(__file__), '..', '..', '..', 'frontend'),
    os.path.join(os.getcwd(), 'frontend'),
]
_frontend_dir = next((os.path.abspath(p) for p in _possible if os.path.exists(p)), None)

# API routes — phải đăng ký TRƯỚC khi mount StaticFiles ở "/"
app.include_router(matches.router, prefix="/match", tags=["matches"])
app.include_router(members.router, prefix="/member", tags=["members"])

@app.get("/api/status")
def status():
    return {"status": "running", "frontend": _frontend_dir}

# Mount frontend ở "/" — phải đặt SAU tất cả API routes
# vì StaticFiles ở "/" sẽ catch-all mọi request không match route trước
if _frontend_dir:
    app.mount("/", StaticFiles(directory=_frontend_dir, html=True), name="frontend")
