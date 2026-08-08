#!/bin/bash

# Exit on error
set -e

echo "=== 1. Cập nhật hệ thống & Cài đặt Node.js 20 LTS ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "=== 2. Kiểm tra phiên bản Node.js & npm ==="
node -v
npm -v

echo "=== 3. Cài đặt pnpm & pm2 toàn cục ==="
sudo npm install -g pnpm pm2

echo "=== 4. Di chuyển vào thư mục dự án ==="
PROJECT_DIR="$HOME/PredictionSystem"
if [ -d "$PROJECT_DIR" ]; then
    cd "$PROJECT_DIR"
else
    echo "Thư mục $PROJECT_DIR không tồn tại. Vui lòng kiểm tra lại vị trí dự án."
    exit 1
fi

echo "=== 5. Cài đặt dependencies (pnpm install) ==="
pnpm install

echo "=== 6. Build Backend & Frontend ==="
echo "Building Backend..."
cd "$PROJECT_DIR/backend"
pnpm build

echo "Building Frontend..."
cd "$PROJECT_DIR/frontend"
pnpm build

echo "=== 7. Quản lý và khởi chạy ứng dụng bằng PM2 ==="
pm2 delete all 2>/dev/null || true

# Start Backend
cd "$PROJECT_DIR/backend"
pm2 start "node dist/server.js" --name "prediction-backend"

# Start Frontend
cd "$PROJECT_DIR/frontend"
pm2 start "pnpm start" --name "prediction-frontend"

# Lưu trạng thái PM2 để tự khởi động lại khi reboot VPS
pm2 save

echo ""
echo "=================================================="
echo " PROJEC T ĐÃ ĐƯỢC CÀI ĐẶT VÀ CHẠY THÀNH CÔNG! "
echo "=================================================="
pm2 status
