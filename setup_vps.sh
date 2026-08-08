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

echo "=== 5. Cấu hình file .env trên VPS ==="
cat << 'EOF' > "$PROJECT_DIR/.env"
# ==================== MongoDB ====================
MONGODB_URI=mongodb+srv://admin:admin@cluster0.psakfab.mongodb.net/
MONGODB_BETTING_DB=betting_db
MONGODB_ORDER_DB=evient_orders

# ==================== JWT ====================
JWT_SECRET=BettingPlatformSecret_Z5gC2JlTAUs7Pu
JWT_EXPIRES_IN=7d

# ==================== Server ====================
BETTING_PORT=3035
NODE_ENV=production

# ==================== CORS ====================
CORS_ORIGIN=http://123.16.178.213:3031,http://localhost:3031,http://127.0.0.1:3031,http://123.16.178.213:3035

# ==================== Frontend API & Socket ====================
NEXT_PUBLIC_API_URL=http://123.16.178.213:3035/api
NEXT_PUBLIC_SOCKET_URL=http://123.16.178.213:3035

# ==================== Admin Seed ====================
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# ==================== Cloudinary ====================
CLOUDINARY_CLOUD_NAME=dhakrxbsd
CLOUDINARY_API_KEY=289113622635594
CLOUDINARY_API_SECRET=HNVlafCEi7tpquOvQytAJ5u_86M
EOF

cp "$PROJECT_DIR/.env" "$PROJECT_DIR/backend/.env"
cp "$PROJECT_DIR/.env" "$PROJECT_DIR/frontend/.env.local"

echo "=== 6. Cài đặt dependencies (pnpm install --force) ==="
rm -rf node_modules frontend/node_modules backend/node_modules
CI=true pnpm install --force --no-frozen-lockfile

echo "=== 7. Build Backend & Frontend ==="
echo "Building Backend..."
cd "$PROJECT_DIR/backend"
pnpm build

echo "Building Frontend..."
cd "$PROJECT_DIR/frontend"
NEXT_PUBLIC_API_URL=http://123.16.178.213:3035/api NEXT_PUBLIC_SOCKET_URL=http://123.16.178.213:3035 pnpm build

echo "=== 8. Quản lý và khởi chạy ứng dụng bằng PM2 ==="
pm2 delete all 2>/dev/null || true

# Start Backend (Port 3035)
cd "$PROJECT_DIR/backend"
pm2 start "node dist/server.js" --name "prediction-backend"

# Start Frontend (Port 3031)
cd "$PROJECT_DIR/frontend"
pm2 start "pnpm start" --name "prediction-frontend"

# Lưu trạng thái PM2 để tự khởi động lại khi reboot VPS
pm2 save

echo ""
echo "=================================================="
echo " DỰ ÁN ĐÃ ĐƯỢC CHẠY THÀNH CÔNG TRÊN PUBLIC IP! "
echo " Frontend: http://123.16.178.213:3031 "
echo " Backend API: http://123.16.178.213:3035/api "
echo "=================================================="
pm2 status
