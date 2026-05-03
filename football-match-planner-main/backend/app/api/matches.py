from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, timedelta
import time
import uuid
from db.database import get_matches_collection
from db.postgres import get_pg_db
from models.user_pg import MatchPg, CategoryPg, TaskPg, SubtaskPg, ActivityLogPg
from models.schemas import UpdateTaskRequest, MatchCreate, UpdateMatchStatusRequest, UpdateTreeRequest

router = APIRouter()
matches_collection = get_matches_collection()

DEFAULT_CATEGORIES = [
    {
        "name": "Hậu cần & Sân bãi",
        "tasks": [
            {"name": "Đặt sân bóng", "status": "Todo", "task_type": "logistics", "subtasks": [
                {"name": "Tìm sân phù hợp và chốt giá", "cost": 0, "status": "Todo"},
                {"name": "Đặt cọc tiền sân", "cost": 10, "status": "Todo"}
            ]},
            {"name": "Mua nước uống & Giải khát", "status": "Todo", "task_type": "logistics", "subtasks": [
                {"name": "Mua 2 thùng nước suối", "cost": 10, "status": "Todo"},
                {"name": "Mua đá viên và cốc", "cost": 5, "status": "Todo"}
            ]},
            {"name": "Chuẩn bị bóng & Đồng phục", "status": "Todo", "task_type": "logistics", "subtasks": [
                {"name": "Bơm đủ 2 quả bóng", "cost": 0, "status": "Todo"},
                {"name": "Giặt và mang áo pitch", "cost": 5, "status": "Todo"}
            ]}
        ]
    },
    {
        "name": "Tài chính & Quỹ Đội",
        "tasks": [
            {"name": "Thu tiền sân (chia đầu người)", "status": "Todo", "task_type": "logistics", "subtasks": [
                {"name": "Tính tổng chi phí / số người", "cost": 0, "status": "Todo"},
                {"name": "Thông báo đóng tiền lên nhóm", "cost": 0, "status": "Todo"}
            ]},
            {"name": "Cập nhật quỹ đội", "status": "Todo", "task_type": "logistics", "subtasks": [
                {"name": "Nhắc nhở thành viên chưa đóng", "cost": 0, "status": "Todo"},
                {"name": "Cập nhật bảng thu chi", "cost": 0, "status": "Todo"}
            ]}
        ]
    },
    {
        "name": "Chuyên môn & Chiến thuật",
        "tasks": [
            {"name": "Chốt danh sách đăng ký", "status": "Todo", "task_type": "general", "subtasks": [
                {"name": "Tạo poll báo danh", "cost": 0, "status": "Todo"},
                {"name": "Chốt số lượng trước 1 ngày", "cost": 0, "status": "Todo"}
            ]},
            {"name": "Lên sơ đồ & Chiến thuật", "status": "Todo", "task_type": "general", "subtasks": [
                {"name": "Xếp đội hình xuất phát", "cost": 0, "status": "Todo"},
                {"name": "Lên kịch bản thay người", "cost": 0, "status": "Todo"}
            ]}
        ]
    },
    {
        "name": "Truyền thông",
        "tasks": [
            {"name": "Chụp ảnh/Quay phim trận đấu", "status": "Todo", "task_type": "general", "subtasks": [
                {"name": "Sạc đầy pin máy ảnh/điện thoại", "cost": 0, "status": "Todo"},
                {"name": "Mang theo tripod (chân máy)", "cost": 0, "status": "Todo"}
            ]},
            {"name": "Viết bài tổng kết Fanpage", "status": "Todo", "task_type": "general", "subtasks": [
                {"name": "Viết caption tóm tắt trận đấu", "cost": 0, "status": "Todo"},
                {"name": "Đăng tải ảnh và gắn thẻ anh em", "cost": 0, "status": "Todo"}
            ]}
        ]
    },
    {
        "name": "Việc cá nhân",
        "tasks": [
            {"name": "Gửi văn mẫu xin phép gia đình", "status": "Todo", "task_type": "personal", "subtasks": []}
        ]
    }
]


def _sync_match_to_pg(match_mongo: dict, db: Session):
    match_id = str(match_mongo["_id"])
    existing = db.query(MatchPg).filter(MatchPg.id == match_id).first()
    if existing:
        db.delete(existing)
        db.commit()

    pg_match = MatchPg(
        id=match_id,
        name=match_mongo.get("name", ""),
        date=match_mongo.get("date", ""),
        date_end=match_mongo.get("date_end", ""),
        status=match_mongo.get("status", ""),
        created_at=match_mongo.get("created_at", "")
    )
    db.add(pg_match)

    for cat in match_mongo.get("categories", []):
        cat_id = f"cat_{uuid.uuid4().hex[:8]}"
        pg_cat = CategoryPg(id=cat_id, match_id=match_id, name=cat.get("name", ""))
        db.add(pg_cat)
        
        for task in cat.get("tasks", []):
            task_id = f"task_{uuid.uuid4().hex[:8]}"
            pg_task = TaskPg(
                id=task_id, category_id=cat_id, name=task.get("name", ""),
                status=task.get("status", ""), task_type=task.get("task_type", ""),
                location=task.get("location"), cost=task.get("cost"),
                assigned_to=task.get("assigned_to"), assignee_id=task.get("assignee_id")
            )
            db.add(pg_task)
            
            for sub in task.get("subtasks", []):
                sub_id = f"sub_{uuid.uuid4().hex[:8]}"
                pg_sub = SubtaskPg(
                    id=sub_id, task_id=task_id, name=sub.get("name", ""),
                    cost=sub.get("cost"), status=sub.get("status", "")
                )
                db.add(pg_sub)
                
    for log in match_mongo.get("activity_logs", []):
        log_id = f"log_{uuid.uuid4().hex[:8]}"
        pg_log = ActivityLogPg(
            id=log_id, match_id=match_id, action=log.get("action", ""),
            timestamp=log.get("timestamp", ""), actor=log.get("actor", "")
        )
        db.add(pg_log)
        
    db.commit()


# ─────────────────────────────────────────────────────────────
# GET /match  — Lấy danh sách tất cả trận đấu (summary)
# ─────────────────────────────────────────────────────────────
@router.get("/")
def list_matches():
    matches = list(matches_collection.find({}, {"categories": 0, "activity_logs": 0}))
    now = datetime.now()
    for m in matches:
        m["id"] = str(m["_id"])
        # Auto-update status based on datetime
        _auto_update_match_status(m, now)
        del m["_id"]
    return {"data": matches, "total": len(matches)}


# ─────────────────────────────────────────────────────────────
# GET /match/{match_id}  — 1 query duy nhất lấy toàn bộ JSON
# ─────────────────────────────────────────────────────────────
@router.get("/{match_id}")
def get_match(match_id: str, db: Session = Depends(get_pg_db)):
    # --- MONGODB ---
    start_time_mongo = time.time()

    match = matches_collection.find_one({"_id": match_id})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
        
    mongo_time_ms = round((time.time() - start_time_mongo) * 1000, 2)
    
    # Sync to PG if needed
    _sync_match_to_pg(match, db)

    # --- POSTGRESQL ---
    start_time_pg = time.time()
    match_pg = db.query(MatchPg).options(
        joinedload(MatchPg.categories).joinedload(CategoryPg.tasks).joinedload(TaskPg.subtasks)
    ).filter(MatchPg.id == match_id).first()
    
    if match_pg:
        # Simulate accessing data to force load if not already loaded by joinedload
        for c in match_pg.categories:
            for t in c.tasks:
                for s in t.subtasks:
                    pass
    pg_time_ms = round((time.time() - start_time_pg) * 1000, 2)

    match["id"] = str(match["_id"])
    # Auto-update status based on datetime
    now = datetime.now()
    _auto_update_match_status(match, now)
    del match["_id"]

    return {
        "data": match,
        "metadata": {
            "response_time_ms": mongo_time_ms,
            "pg_response_time_ms": pg_time_ms,
            "query_count": 1,
            "message": "Fetched entire nested document with 1 single MongoDB query"
        }
    }


# ─────────────────────────────────────────────────────────────
# POST /match  — Tạo trận đấu mới
# ─────────────────────────────────────────────────────────────
@router.post("/")
def create_match(payload: MatchCreate):
    import uuid
    new_id = f"match_{uuid.uuid4().hex[:8]}"
    doc = payload.dict()
    
    if not doc.get("status"):
        doc["status"] = "Planned"
    
    # Nếu không có categories, nạp bộ menu mặc định
    if not doc.get("categories"):
        doc["categories"] = DEFAULT_CATEGORIES
        
    doc["_id"] = new_id
    doc["created_at"] = datetime.now().isoformat()
    
    actor = "Admin"
    doc["activity_logs"] = [
        {
            "action": f"Tạo mới trận đấu: {payload.name}",
            "timestamp": datetime.now().isoformat(),
            "actor": actor
        }
    ]
    matches_collection.insert_one(doc)
    return {"message": "Match created", "id": new_id}


# ─────────────────────────────────────────────────────────────
# DELETE /match/{match_id}  — Xoá trận thủ công (chỉ được xoá trận chưa hoàn thành)
# ─────────────────────────────────────────────────────────────
@router.delete("/{match_id}")
def delete_match(match_id: str):
    match = matches_collection.find_one({"_id": match_id})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if match.get("status") == "Done":
        raise HTTPException(status_code=400, detail="Không thể xoá trận đấu đã hoàn thành")
    result = matches_collection.delete_one({"_id": match_id})
    return {"message": "Match deleted successfully"}


# ─────────────────────────────────────────────────────────────
# POST /match/{match_id}/update-status  — Cập nhật trạng thái trận đấu
# (Trạng thái giờ tự động chuyển, endpoint này dùng cho trường hợp thủ công)
# ─────────────────────────────────────────────────────────────
@router.post("/{match_id}/update-status")
def update_match_status(match_id: str, payload: UpdateMatchStatusRequest):
    allowed = ["Planned", "In Progress", "Done"]
    if payload.status not in allowed:
        raise HTTPException(status_code=400, detail="Invalid status. Allowed: Planned, In Progress, Done")

    actor = payload.actor or "Admin"

    result = matches_collection.update_one(
        {"_id": match_id},
        {
            "$set": {"status": payload.status},
            "$push": {
                "activity_logs": {
                    "action": f"Cập nhật trạng thái trận đấu → {payload.status}",
                    "timestamp": datetime.now().isoformat(),
                    "actor": actor
                }
            }
        }
    )

    # Nếu chuyển sang In Progress hoặc Done → đẩy task chưa xong sang Incomplete
    if payload.status in ("In Progress", "Done"):
        _move_unfinished_tasks_to_incomplete(match_id, actor)

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Match not found")
    return {"message": "Match status updated successfully"}


# ─────────────────────────────────────────────────────────────
# POST /match/{match_id}/update-task  — Cập nhật trạng thái task + ghi log
# ─────────────────────────────────────────────────────────────
@router.post("/{match_id}/update-task")
def update_task(match_id: str, payload: UpdateTaskRequest):
    filter_query = {"_id": match_id}

    actor = payload.actor or payload.assigned_to or "Admin"

    # Log entry
    changes = [f"'{payload.task_name}' → '{payload.new_status}'"]
    if payload.location: changes.append(f"📍 {payload.location}")
    if payload.cost is not None: changes.append(f"💰 {payload.cost} USD")
    if payload.assigned_to: changes.append(f"👤 {payload.assigned_to}")

    log_entry = {
        "action": f"[{payload.category_name}] " + " | ".join(changes),
        "timestamp": datetime.now().isoformat(),
        "actor": actor
    }

    set_ops = {
        "categories.$[c].tasks.$[t].status": payload.new_status
    }
    if payload.location is not None: set_ops["categories.$[c].tasks.$[t].location"] = payload.location
    if payload.assigned_to is not None: set_ops["categories.$[c].tasks.$[t].assigned_to"] = payload.assigned_to
    if payload.assignee_id is not None: set_ops["categories.$[c].tasks.$[t].assignee_id"] = payload.assignee_id
    if payload.cost is not None: set_ops["categories.$[c].tasks.$[t].cost"] = payload.cost
    if payload.subtasks is not None: set_ops["categories.$[c].tasks.$[t].subtasks"] = [s.dict() for s in payload.subtasks]

    result = matches_collection.update_one(
        filter_query,
        {
            "$set": set_ops,
            "$push": {"activity_logs": log_entry}
        },
        array_filters=[
            {"c.name": payload.category_name},
            {"t.name": payload.task_name}
        ]
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Match not found")

    return {"message": "Update successful", "log": log_entry}


# ─────────────────────────────────────────────────────────────
# POST /match/{match_id}/update-tree — Lưu lại cấu trúc cây sau kéo thả
# ─────────────────────────────────────────────────────────────
@router.post("/{match_id}/update-tree")
def update_tree(match_id: str, payload: UpdateTreeRequest):
    actor = payload.actor or "Admin"
    result = matches_collection.update_one(
        {"_id": match_id},
        {
            "$set": {"categories": payload.categories},
            "$push": {
                "activity_logs": {
                    "action": "Sắp xếp lại cấu trúc cây (kéo-thả)",
                    "timestamp": datetime.now().isoformat(),
                    "actor": actor
                }
            }
        }
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Match not found")
    return {"message": "Tree structure saved successfully"}


# ─────────────────────────────────────────────────────────────
# GET /match/{match_id}/analytics — Aggregation Pipeline phân tích hiệu suất
# ─────────────────────────────────────────────────────────────
@router.get("/{match_id}/analytics")
def get_analytics(match_id: str):
    """
    Chạy MongoDB Aggregation Pipeline nâng cao để:
    1. Unwind categories → tasks → subtasks
    2. Data Cleansing: Tự động phát hiện và bỏ qua sub-task có:
       - status = null / "null" / "" / "N/A"
       - cost dạng chuỗi (không phải số)
    3. Tính điểm hiệu suất từng thành viên:
       - Task Done = 10đ, In Progress = 5đ, Todo = 1đ
       - Sub-task Done = 3đ (bonus), Sub-task In Progress = 1đ
    4. Group by assigned_to, tính tổng điểm & tỷ lệ hoàn thành
    5. Trả về số sub-task lỗi đã bị bỏ qua để minh bạch
    """

    # ─── Pipeline 1: Tính điểm hiệu suất từng thành viên (task-level + subtask bonus) ───
    pipeline = [
        {"$match": {"_id": match_id}},
        {"$unwind": "$categories"},
        {"$unwind": "$categories.tasks"},

        # Tính subtask stats ngay tại task level (trước khi filter)
        {
            "$addFields": {
                # Lọc subtask hợp lệ (status phải là string hợp lệ, cost phải là số hoặc null)
                "valid_subtasks": {
                    "$filter": {
                        "input": {"$ifNull": ["$categories.tasks.subtasks", []]},
                        "as": "st",
                        "cond": {
                            "$and": [
                                {"$in": ["$$st.status", ["Todo", "In Progress", "Done", "Incomplete"]]},
                                {"$or": [
                                    {"$eq": [{"$type": "$$st.cost"}, "int"]},
                                    {"$eq": [{"$type": "$$st.cost"}, "double"]},
                                    {"$eq": [{"$type": "$$st.cost"}, "long"]},
                                    {"$eq": [{"$type": "$$st.cost"}, "null"]},
                                    {"$not": {"$gt": ["$$st.cost", None]}}
                                ]}
                            ]
                        }
                    }
                },
                "all_subtasks": {"$ifNull": ["$categories.tasks.subtasks", []]},
            }
        },

        # Tính số subtask bị bỏ qua (lỗi)
        {
            "$addFields": {
                "skipped_subtask_count": {
                    "$subtract": [
                        {"$size": "$all_subtasks"},
                        {"$size": "$valid_subtasks"}
                    ]
                },
                "subtask_done_count": {
                    "$size": {
                        "$filter": {
                            "input": "$valid_subtasks",
                            "as": "st",
                            "cond": {"$eq": ["$$st.status", "Done"]}
                        }
                    }
                },
                "subtask_inprogress_count": {
                    "$size": {
                        "$filter": {
                            "input": "$valid_subtasks",
                            "as": "st",
                            "cond": {"$eq": ["$$st.status", "In Progress"]}
                        }
                    }
                },
                "valid_subtask_count": {"$size": "$valid_subtasks"}
            }
        },

        # Data Cleansing — bỏ qua tasks chính có status lỗi
        {
            "$match": {
                "categories.tasks.status": {
                    "$exists": True,
                    "$nin": [None, "null", "", "N/A", "Chưa chốt"]
                }
            }
        },

        # Tính điểm task + bonus subtask
        {
            "$addFields": {
                "task_score": {
                    "$switch": {
                        "branches": [
                            {"case": {"$eq": ["$categories.tasks.status", "Done"]}, "then": 10},
                            {"case": {"$eq": ["$categories.tasks.status", "In Progress"]}, "then": 5},
                            {"case": {"$eq": ["$categories.tasks.status", "Todo"]}, "then": 1}
                        ],
                        "default": 0
                    }
                },
                # Bonus: 3đ mỗi subtask Done, 1đ mỗi subtask In Progress
                "subtask_bonus": {
                    "$add": [
                        {"$multiply": ["$subtask_done_count", 3]},
                        {"$multiply": ["$subtask_inprogress_count", 1]}
                    ]
                },
                "is_done": {
                    "$cond": [{"$eq": ["$categories.tasks.status", "Done"]}, 1, 0]
                }
            }
        },

        # Group by assigned_to
        {
            "$group": {
                "_id": "$categories.tasks.assigned_to",
                "task_score": {"$sum": "$task_score"},
                "subtask_bonus": {"$sum": "$subtask_bonus"},
                "total_score": {"$sum": {"$add": ["$task_score", "$subtask_bonus"]}},
                "total_tasks": {"$sum": 1},
                "done_tasks": {"$sum": "$is_done"},
                "total_subtasks": {"$sum": "$valid_subtask_count"},
                "done_subtasks": {"$sum": "$subtask_done_count"},
                "skipped_subtasks": {"$sum": "$skipped_subtask_count"}
            }
        },

        # Tính completion_rate
        {
            "$addFields": {
                "completion_rate": {
                    "$round": [
                        {"$multiply": [
                            {"$divide": ["$done_tasks", {"$max": ["$total_tasks", 1]}]},
                            100
                        ]},
                        1
                    ]
                },
                "subtask_completion_rate": {
                    "$round": [
                        {"$multiply": [
                            {"$divide": ["$done_subtasks", {"$max": ["$total_subtasks", 1]}]},
                            100
                        ]},
                        1
                    ]
                }
            }
        },

        # Sắp xếp BXH
        {"$sort": {"total_score": -1}},

        # Project
        {
            "$project": {
                "_id": 0,
                "member": "$_id",
                "total_score": 1,
                "task_score": 1,
                "subtask_bonus": 1,
                "total_tasks": 1,
                "done_tasks": 1,
                "completion_rate": 1,
                "total_subtasks": 1,
                "done_subtasks": 1,
                "subtask_completion_rate": 1,
                "skipped_subtasks": 1
            }
        }
    ]

    result = list(matches_collection.aggregate(pipeline))

    # ─── Pipeline 2: Tổng quỹ (chỉ tính cost là số) ───
    fund_pipeline = [
        {"$match": {"_id": match_id}},
        {"$unwind": "$categories"},
        {"$unwind": "$categories.tasks"},
        {"$unwind": {"path": "$categories.tasks.subtasks", "preserveNullAndEmptyArrays": True}},
        {
            "$match": {
                "categories.tasks.subtasks.cost": {"$type": ["int", "double", "long"]}
            }
        },
        {
            "$group": {
                "_id": None,
                "total_fund": {"$sum": "$categories.tasks.subtasks.cost"}
            }
        }
    ]
    fund_result = list(matches_collection.aggregate(fund_pipeline))
    total_fund = fund_result[0]["total_fund"] if fund_result else 0

    # ─── Pipeline 3: Tiến độ tổng thể ───
    progress_pipeline = [
        {"$match": {"_id": match_id}},
        {"$unwind": "$categories"},
        {"$unwind": "$categories.tasks"},
        {
            "$match": {
                "categories.tasks.status": {
                    "$exists": True,
                    "$nin": [None, "null", "", "N/A", "Chưa chốt", "Todo"]
                }
            }
        },
        {"$group": {
            "_id": None,
            "total": {"$sum": 1},
            "done": {"$sum": {"$cond": [{"$eq": ["$categories.tasks.status", "Done"]}, 1, 0]}}
        }}
    ]
    prog_result = list(matches_collection.aggregate(progress_pipeline))
    total_tasks = prog_result[0]["total"] if prog_result else 0
    done_tasks = prog_result[0]["done"] if prog_result else 0

    # ─── Pipeline 4: Đếm tổng subtask bị bỏ qua ───
    skipped_pipeline = [
        {"$match": {"_id": match_id}},
        {"$unwind": "$categories"},
        {"$unwind": "$categories.tasks"},
        {"$unwind": {"path": "$categories.tasks.subtasks", "preserveNullAndEmptyArrays": False}},
        {
            "$match": {
                "$or": [
                    {"categories.tasks.subtasks.status": {"$in": [None, "null", "", "N/A"]}},
                    {"categories.tasks.subtasks.status": {"$exists": False}},
                    {"categories.tasks.subtasks.cost": {"$type": "string"}}
                ]
            }
        },
        {"$count": "total_skipped"}
    ]
    skipped_result = list(matches_collection.aggregate(skipped_pipeline))
    total_skipped = skipped_result[0]["total_skipped"] if skipped_result else 0

    return {
        "match_id": match_id,
        "leaderboard": result,
        "total_fund_usd": total_fund,
        "total_tasks": total_tasks,
        "done_tasks": done_tasks,
        "total_skipped_subtasks": total_skipped,
        "scoring_rules": {
            "task_done": 10,
            "task_in_progress": 5,
            "task_todo": 1,
            "subtask_done_bonus": 3,
            "subtask_in_progress_bonus": 1
        },
        "note": "Các sub-task có status=null/'N/A' hoặc cost dạng chuỗi đã bị phát hiện và bỏ qua tự động trong pipeline tính toán"
    }


# ─────────────────────────────────────────────────────────────
# GET /match/{match_id}/logs — Lịch sử thay đổi
# ─────────────────────────────────────────────────────────────
@router.get("/{match_id}/logs")
def get_logs(match_id: str):
    match = matches_collection.find_one({"_id": match_id}, {"activity_logs": 1})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    logs = match.get("activity_logs", [])
    # Trả về mới nhất trước
    return {"logs": list(reversed(logs)), "total": len(logs)}


# ─────────────────────────────────────────────────────────────
# HELPER: Auto-update match status based on datetime
# ─────────────────────────────────────────────────────────────
def _parse_match_datetime(date_str: str):
    """Parse match date string to datetime. Supports ISO format and datetime-local."""
    if not date_str:
        return None
    try:
        # Try ISO format with T separator (datetime-local)
        return datetime.fromisoformat(date_str)
    except (ValueError, TypeError):
        pass
    try:
        # Try date-only format
        return datetime.strptime(date_str, "%Y-%m-%d")
    except (ValueError, TypeError):
        return None


def _auto_update_match_status(match_doc: dict, now: datetime):
    """
    Tự động cập nhật trạng thái trận đấu dựa trên thời gian:
    - now < date (giờ bắt đầu) → Planned (Sắp tới)
    - date ≤ now < date_end (giờ kết thúc) → In Progress (Đang diễn ra)
    - now ≥ date_end → Done (Hoàn thành)
    Khi chuyển sang In Progress hoặc Done, các task Todo/In Progress sẽ chuyển sang Incomplete.
    """
    match_start = _parse_match_datetime(match_doc.get("date", ""))
    match_end = _parse_match_datetime(match_doc.get("date_end", ""))
    
    if not match_start:
        return  # Không parse được → giữ nguyên
    
    # Nếu không có date_end, chỉ dùng start (mặc định +2h)
    if not match_end:
        match_end = match_start + timedelta(hours=2)

    old_status = match_doc.get("status", "Planned")

    if now < match_start:
        new_status = "Planned"
    elif now < match_end:
        new_status = "In Progress"
    else:
        new_status = "Done"

    if old_status != new_status:
        match_id = match_doc.get("_id") or match_doc.get("id")
        if match_id:
            log_entry = {
                "action": f"[Tự động] Trạng thái trận đấu: {old_status} → {new_status}",
                "timestamp": now.isoformat(),
                "actor": "System"
            }
            matches_collection.update_one(
                {"_id": match_id},
                {
                    "$set": {"status": new_status},
                    "$push": {"activity_logs": log_entry}
                }
            )
            # Khi chuyển sang In Progress hoặc Done → đẩy task chưa hoàn thành
            if new_status in ("In Progress", "Done"):
                _move_unfinished_tasks_to_incomplete(match_id, "System")

        match_doc["status"] = new_status


def _move_unfinished_tasks_to_incomplete(match_id: str, actor: str):
    """
    Di chuyển tất cả task có status Todo hoặc In Progress sang Incomplete
    khi trận đấu bắt đầu diễn ra.
    """
    match = matches_collection.find_one({"_id": match_id})
    if not match:
        return

    categories = match.get("categories", [])
    changed = False
    changed_tasks = []

    for cat in categories:
        for task in cat.get("tasks", []):
            if task.get("status") in ("Todo", "In Progress"):
                changed_tasks.append(task.get("name", "?"))
                task["status"] = "Incomplete"
                # Also mark subtasks
                for st in task.get("subtasks", []):
                    if st.get("status") in ("Todo", "In Progress"):
                        st["status"] = "Incomplete"
                changed = True

    if changed:
        log_entry = {
            "action": f"[Tự động] Đẩy {len(changed_tasks)} task chưa hoàn thành → Không hoàn thành: {', '.join(changed_tasks[:5])}{'...' if len(changed_tasks) > 5 else ''}",
            "timestamp": datetime.now().isoformat(),
            "actor": actor
        }
        matches_collection.update_one(
            {"_id": match_id},
            {
                "$set": {"categories": categories},
                "$push": {"activity_logs": log_entry}
            }
        )
