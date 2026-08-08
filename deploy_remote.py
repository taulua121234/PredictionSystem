import subprocess
import sys

def deploy():
    print("=== Đang kết nối SSH tới VPS để tự động chạy setup_vps.sh ===")
    vps_cmd = "cd ~/PredictionSystem && git fetch origin && git checkout deploy && git pull origin deploy && chmod +x setup_vps.sh && ./setup_vps.sh"
    ssh_command = ["ssh", "-p", "3030", "enima@123.16.178.213", vps_cmd]
    
    try:
        subprocess.run(ssh_command, check=True)
        print("\n=== ĐÃ HOÀN THÀNH CÀI ĐẶT TRÊN VPS ===")
    except subprocess.CalledProcessError as e:
        print(f"\nLỗi khi thực hiện SSH: {e}")

if __name__ == "__main__":
    deploy()
