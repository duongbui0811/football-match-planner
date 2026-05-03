# Football Match Planner (Kiến trúc Lai: MongoDB + PostgreSQL)

Dự án này là nền tảng quản lý trận đấu bóng đá (Creative Project Portfolio) sử dụng kiến trúc **Polyglot Persistence**, kết hợp điểm mạnh của cả MongoDB và PostgreSQL.

*   **MongoDB:** Lưu trữ dữ liệu cấu trúc dạng cây phân cấp (các Trận đấu, Giai đoạn, Nhiệm vụ, Sub-task).
*   **PostgreSQL:** Lưu trữ dữ liệu có cấu trúc, quan hệ và yêu cầu ACID (Người dùng, Đăng nhập, Phân quyền).

## Yêu cầu Hệ thống (Prerequisites)

1.  **Python 3.9+** (đã cài đặt sẵn trên máy).
2.  **MongoDB** đang chạy ở cổng mặc định `localhost:27017` (không cần mật khẩu mặc định).
3.  **PostgreSQL** đang chạy ở cổng mặc định `localhost:5432`.
    *   Tài khoản: `postgres`
    *   Mật khẩu: `postgres`
    *   *Lưu ý: Nếu bạn có mật khẩu khác, hãy vào file `backend/app/db/postgres.py` để đổi lại dòng `PG_URI`.*

## Hướng dẫn Cài đặt & Chạy chi tiết

### Bước 1: Tạo Database trong PostgreSQL
1. Mở công cụ quản lý PostgreSQL của bạn (như **pgAdmin**, **DBeaver**, hoặc dùng công cụ dòng lệnh `psql`).
2. Tạo một database mới tên là `football_planner`.
   Nếu dùng SQL query:
   ```sql
   CREATE DATABASE football_planner;
   ```

### Bước 2: Cài đặt thư viện Python
Mở Terminal/PowerShell tại thư mục gốc của dự án (nơi có file `requirements.txt`) và chạy lệnh:
```bash
pip install -r requirements.txt
```

### Bước 3: Nạp dữ liệu mẫu (Seed Data) và Khởi tạo Bảng (Tables)
Quá trình này sẽ tự động tạo các bảng (Tables) bên trong PostgreSQL và chèn sẵn 5 tài khoản mẫu, đồng thời chèn 10 trận đấu mẫu vào MongoDB.
Chạy lệnh sau tại thư mục gốc:
```bash
python backend/app/scripts/seed_data.py
```
*Đảm bảo bạn thấy thông báo "✅ Đã tạo 5 người dùng thành công (PostgreSQL)!" và "✅ Đã tạo 10 trận đấu thành công (MongoDB)!".*

### Bước 4: Khởi chạy Ứng dụng
Bạn chỉ cần chạy file script khởi động gốc của dự án:
```bash
RUN_APP.bat
```
*(Hoặc chạy lệnh `python start_all.py` trong terminal)*

File này sẽ tự động khởi động Backend API (FastAPI) và phục vụ trang Frontend.

---

## Thông tin Đăng nhập Mẫu (sau khi Seed)

Sử dụng một trong các tài khoản sau để đăng nhập vào hệ thống:

| Tên hiển thị | Username | Password | Vai trò (Role) |
| :--- | :--- | :--- | :--- |
| Admin | `admin` | `123` | Admin |
| Dương | `duong` | `123` | Member |
| Vũ | `vu` | `123` | Member |
| Tài | `tai` | `123` | Member |
| Đăng | `dang` | `123` | Member |

---

## Cấu trúc thư mục (liên quan đến Database)
*   `backend/app/db/database.py`: Quản lý kết nối tới MongoDB.
*   `backend/app/db/postgres.py`: Quản lý kết nối (Engine, Session) tới PostgreSQL.
*   `backend/app/models/user_pg.py`: Định nghĩa Table `members` bằng SQLAlchemy.
*   `backend/app/api/members.py`: API quản lý user, đọc/ghi vào PostgreSQL.
*   `backend/app/api/matches.py`: API quản lý trận đấu, đọc/ghi vào MongoDB.
