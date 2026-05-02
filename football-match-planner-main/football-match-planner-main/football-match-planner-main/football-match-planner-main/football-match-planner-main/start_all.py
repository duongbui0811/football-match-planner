import subprocess
import socket
import time
import sys
import os
import webbrowser

def check_mongodb():
    print("[1/4] Kiểm tra MongoDB (localhost:27017)...")
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1)
        if s.connect_ex(('127.0.0.1', 27017)) != 0:
            print("\n❌ LỖI: MongoDB chưa chạy!")
            print("Vui lòng chạy lệnh: net start MongoDB")
            return False
    print("✅ MongoDB đã sẵn sàng.")
    return True

def run_command(cmd, name):
    print(f"🚀 Đang chạy {name}...")
    # Sử dụng subprocess.Popen để chạy ngầm và không chặn script chính
    return subprocess.Popen(cmd, shell=True)

def main():
    print("="*50)
    print("   FOOTBALL MATCH PLANNER - KHỞI ĐỘNG NHANH")
    print("="*50)

    if not check_mongodb():
        input("\nNhấn phím bất kỳ để thoát...")
        return

    print("[2/4] Kiểm tra thư viện (pip install)...")
    subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt", "-q"])
    print("✅ Thư viện đã sẵn sàng.")

    print("[3/4] Kiểm tra & Seed dữ liệu...")
    subprocess.run([sys.executable, "backend/app/scripts/seed_data.py"])
    print("✅ Dữ liệu đã sẵn sàng.")

    print("[4/4] Đang khởi động Server & Frontend...")
    
    # Chạy Backend (cửa sổ mới)
    subprocess.Popen(f'start "Backend" /min {sys.executable} run.py', shell=True)
    
    # Chạy Frontend (cửa sổ mới)
    subprocess.Popen(f'start "Frontend" /min {sys.executable} -m http.server 3000 --directory frontend', shell=True)

    print("\n🌍 Backend : http://localhost:8000")
    print("🌍 Frontend: http://localhost:3000")
    print("\nĐang mở trình duyệt trong 3 giây...")
    
    time.sleep(3)
    webbrowser.open("http://localhost:3000")
    
    print("\n✅ HOÀN TẤT! Ứng dụng đã khởi động.")
    print("="*50)

if __name__ == "__main__":
    main()
