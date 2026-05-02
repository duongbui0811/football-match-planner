import sys
import os
import uuid
import random
from datetime import datetime, timedelta

# Chạy từ thư mục backend/app: python scripts/seed_data.py
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.database import get_matches_collection, get_members_collection
from db.postgres import engine, Base, SessionLocal
from models.user_pg import Member

def seed():
    matches_collection = get_matches_collection()
    
    # Initialize Postgres tables
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    print("🗑️ Đang xóa dữ liệu cũ (overwrite)...")
    matches_collection.delete_many({})
    db.query(Member).delete()
    db.commit()

    # 1. Seed 5 users
    print("👥 Đang tạo 5 người dùng...")
    password_hash = "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3"
    
    users = [
        {"name": "Admin", "username": "admin", "role": "Admin"},
        {"name": "Dương", "username": "duong", "role": "Member"},
        {"name": "Vũ", "username": "vu", "role": "Member"},
        {"name": "Tài", "username": "tai", "role": "Member"},
        {"name": "Đăng", "username": "dang", "role": "Member"},
    ]

    for u in users:
        db_member = Member(
            id=f"mem_{uuid.uuid4().hex[:8]}",
            name=u["name"],
            username=u["username"],
            password=password_hash,
            role=u["role"]
        )
        db.add(db_member)
        
    db.commit()
    print(f"✅ Đã tạo {len(users)} người dùng thành công (PostgreSQL)!")

    # 2. Seed 10 matches
    print("⚽ Đang tạo 10 trận đấu với 10 default tasks...")
    matches = []
    
    user_names = [u["name"] for u in users]
    
    for i in range(1, 11):
        match_id = f"match_{uuid.uuid4().hex[:8]}"
        match_date = (datetime.now() + timedelta(days=i*2)).strftime("%Y-%m-%d")
        
        categories = [
            {
                "name": "Hậu cần & Sân bãi",
                "tasks": [
                    {"name": "Đặt sân bóng", "status": "Todo", "task_type": "logistics", "assigned_to": random.choice(user_names), "subtasks": [
                        {"name": "Tìm sân phù hợp và chốt giá", "cost": 0, "status": "Todo"},
                        {"name": "Đặt cọc tiền sân", "cost": 10, "status": "Todo"}
                    ]},
                    {"name": "Mua nước uống & Giải khát", "status": "Todo", "task_type": "logistics", "assigned_to": random.choice(user_names), "subtasks": [
                        {"name": "Mua 2 thùng nước suối", "cost": 10, "status": "Todo"},
                        {"name": "Mua đá viên và cốc", "cost": 5, "status": "Todo"}
                    ]},
                    {"name": "Chuẩn bị bóng & Đồng phục", "status": "Todo", "task_type": "logistics", "assigned_to": random.choice(user_names), "subtasks": [
                        {"name": "Bơm đủ 2 quả bóng", "cost": 0, "status": "Todo"},
                        {"name": "Giặt và mang áo pitch", "cost": 5, "status": "Todo"}
                    ]}
                ]
            },
            {
                "name": "Tài chính & Quỹ Đội",
                "tasks": [
                    {"name": "Thu tiền sân (chia đầu người)", "status": "Todo", "task_type": "logistics", "assigned_to": random.choice(user_names), "subtasks": [
                        {"name": "Tính tổng chi phí / số người", "cost": 0, "status": "Todo"},
                        {"name": "Thông báo đóng tiền lên nhóm", "cost": 0, "status": "Todo"}
                    ]},
                    {"name": "Cập nhật quỹ đội", "status": "Todo", "task_type": "logistics", "assigned_to": random.choice(user_names), "subtasks": [
                        {"name": "Nhắc nhở thành viên chưa đóng", "cost": 0, "status": "Todo"},
                        {"name": "Cập nhật bảng thu chi", "cost": 0, "status": "Todo"}
                    ]}
                ]
            },
            {
                "name": "Chuyên môn & Chiến thuật",
                "tasks": [
                    {"name": "Chốt danh sách đăng ký", "status": "Todo", "task_type": "general", "assigned_to": random.choice(user_names), "subtasks": [
                        {"name": "Tạo poll báo danh", "cost": 0, "status": "Todo"},
                        {"name": "Chốt số lượng trước 1 ngày", "cost": 0, "status": "Todo"}
                    ]},
                    {"name": "Lên sơ đồ & Chiến thuật", "status": "Todo", "task_type": "general", "assigned_to": random.choice(user_names), "subtasks": [
                        {"name": "Xếp đội hình xuất phát", "cost": 0, "status": "Todo"},
                        {"name": "Lên kịch bản thay người", "cost": 0, "status": "Todo"}
                    ]}
                ]
            },
            {
                "name": "Truyền thông",
                "tasks": [
                    {"name": "Chụp ảnh/Quay phim trận đấu", "status": "Todo", "task_type": "general", "assigned_to": random.choice(user_names), "subtasks": [
                        {"name": "Sạc đầy pin máy ảnh/điện thoại", "cost": 0, "status": "Todo"},
                        {"name": "Mang theo tripod (chân máy)", "cost": 0, "status": "Todo"}
                    ]},
                    {"name": "Viết bài tổng kết Fanpage", "status": "Todo", "task_type": "general", "assigned_to": random.choice(user_names), "subtasks": [
                        {"name": "Viết caption tóm tắt trận đấu", "cost": 0, "status": "Todo"},
                        {"name": "Đăng tải ảnh và gắn thẻ anh em", "cost": 0, "status": "Todo"}
                    ]}
                ]
            }
        ]
        
        match = {
            "_id": match_id,
            "name": f"Trận đấu giao hữu vòng {i}",
            "date": match_date,
            "status": "Planned",
            "categories": categories,
            "activity_logs": [
                {
                    "action": f"Tạo mới trận đấu vòng {i} qua dữ liệu seed",
                    "timestamp": datetime.now().isoformat(),
                    "actor": "Admin"
                }
            ],
            "created_at": datetime.now().isoformat()
        }
        matches.append(match)
        
    matches_collection.insert_many(matches)
    print(f"✅ Đã tạo {len(matches)} trận đấu thành công (MongoDB)!")
    print("🎉 Hoàn tất quá trình nạp dữ liệu mẫu!")
    
    db.close()

if __name__ == "__main__":
    seed()