"""
Entry point chạy FastAPI — không cần Docker.
Cách dùng: python run.py
PYTHONPATH được set tự động.
"""
import sys
import os

APP_DIR = os.path.join(os.path.dirname(__file__), 'backend', 'app')
sys.path.insert(0, APP_DIR)
os.environ['PYTHONPATH'] = APP_DIR   # Cho subprocess kế thừa

import uvicorn

if __name__ == "__main__":
    print("=" * 50)
    print("  Football Match Planner Backend")
    print("  http://localhost:8000")
    print("  http://localhost:8000/docs")
    print("=" * 50)
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=False  
    )
