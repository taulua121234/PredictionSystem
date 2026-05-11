# 🏇 Umamusume Prediction & Betting Platform

> Nền tảng dự đoán kết quả giải đấu Umamusume theo thời gian thực, được thiết kế tách biệt khỏi hệ thống bán vé chính. Hệ thống cho phép khán giả sử dụng mã vé (`ticketCode`) để tham gia dự đoán kết quả các race, tích luỹ điểm, cạnh tranh leaderboard và theo dõi tỷ lệ dự đoán trực tiếp.

---

# 📌 Tổng quan hệ thống

| Thành phần | Công nghệ | Mô tả |
|---|---|---|
| **Frontend** | Next.js, TailwindCSS, TypeScript | Giao diện prediction platform realtime |
| **Backend** | Express.js, Socket.IO | Xử lý prediction, payout, leaderboard |
| **Realtime Engine** | Socket.IO | Đồng bộ trạng thái race và betting realtime |
| **Database** | MongoDB Atlas (Mongoose) | Lưu dữ liệu betting và leaderboard |
| **Authentication** | JWT + Ticket Validation | Đăng nhập bằng mã vé sự kiện |
| **Ticket Integration** | Internal API | Đồng bộ dữ liệu vé từ hệ thống bán vé |
| **Deployment** | Vercel + Railway | Frontend và Backend cloud deployment |

---

# 🏗️ Kiến trúc hệ thống

```text
                ┌────────────────────┐
                │  Ticket Website    │
                │  (Main Platform)   │
                └─────────┬──────────┘
                          │
                 Internal Ticket API
                          │
                          ▼
                ┌────────────────────┐
                │  Betting Backend   │
                │ Express + SocketIO │
                └─────────┬──────────┘
                          │
               REST API + WebSocket
                          │
                          ▼
                ┌────────────────────┐
                │ Betting Frontend   │
                │      Next.js       │
                └────────────────────┘
```

---

# 🔑 Tính năng chính

## 👤 Phía Người dùng (Viewer)

- Đăng nhập bằng mã vé (`ticketCode`) đã mua từ hệ thống bán vé.
- Tự động tạo tài khoản prediction trong lần đăng nhập đầu tiên.
- Nhận số điểm khởi đầu dựa theo hạng vé.
- Dự đoán kết quả race theo nhiều hạng mục khác nhau.
- Theo dõi leaderboard realtime.
- Xem lịch sử đặt cược và lợi nhuận.
- Theo dõi tỷ lệ dự đoán của cộng đồng theo thời gian thực.
- Theo dõi countdown khóa cược trước race.

---

## 🛡️ Phía Quản trị (Admin)

- Tạo và quản lý race.
- Quản lý Uma, trainer và odd.
- Mở/khóa betting.
- Nhập kết quả sau khi race kết thúc.
- Settlement payout tự động.
- Theo dõi leaderboard và analytics.
- Điều chỉnh điểm hoặc refund thủ công.

---

# 🎯 Betting Categories

| Hạng mục | Mô tả |
|---|---|
| **Uma Win** | Dự đoán Uma top 1 |
| **Trainer Win** | Dự đoán trainer chiến thắng |
| **Trifecta** | Dự đoán chính xác top 1, 2, 3 |

---

# 💰 Economy System

## Starting Points

Người dùng được cấp điểm khởi đầu theo hạng vé:

| Hạng vé | Starting Points |
|---|---|
| NORMAL | 3000 |
| VIP | 4000 |
| DELUXE | 5000 |

---

## Betting Formula

```text
reward = betAmount × odd
```

Ví dụ:

```text
100 × 3.5 = 350 points
```

Điểm sẽ bị trừ ngay khi đặt cược.

---

# 🏆 Leaderboard System

## Income Leaderboard (Main)

```text
income = currentPoints - startingPoints
```

Đây là leaderboard chính nhằm đảm bảo công bằng giữa các hạng vé khác nhau.

---

## ROI Leaderboard

```text
ROI = (totalPayout - totalBet) / totalBet
```

Dành cho người chơi có tỷ lệ dự đoán hiệu quả nhất.

---

## Raw Points Leaderboard

Xếp hạng theo tổng điểm hiện tại.

---

# 📊 Top Predicted Uma

Hệ thống hiển thị realtime tỷ lệ dự đoán của cộng đồng.

Ví dụ:

```text
Vodka        45%
Oguri Cap    30%
Rice Shower  25%
```

Tỷ lệ được cập nhật realtime thông qua WebSocket.

---

# ⚡ Race State Machine

```text
UPCOMING
    ↓
BETTING_OPEN
    ↓
LOCKED
    ↓
FINISHED
    ↓
SETTLED
```

| State | Ý nghĩa |
|---|---|
| UPCOMING | Race chưa mở cược |
| BETTING_OPEN | Cho phép đặt cược |
| LOCKED | Đã khóa cược |
| FINISHED | Race đã kết thúc |
| SETTLED | Đã payout toàn bộ |

---

# 🔄 Betting Flow

```text
User
 │
 │ chọn prediction
 ▼
Frontend
 │
 │ POST /bets/place
 ▼
Backend
 │
 ├─ Verify JWT
 ├─ Check race state
 ├─ Validate balance
 ├─ Mongo Transaction
 ├─ Deduct points
 ├─ Create bet
 ├─ Create transaction log
 ├─ Commit transaction
 └─ Broadcast websocket
 │
 ▼
Realtime frontend update
```

---

# 🔄 Settlement Flow

```text
Admin
 │
 │ nhập kết quả race
 ▼
Backend
 │
 ├─ Set FINISHED
 ├─ Load bets
 ├─ Calculate winners
 ├─ Calculate payout
 ├─ Bulk update users
 ├─ Create transactions
 ├─ Set SETTLED
 └─ Broadcast websocket
 │
 ▼
Realtime leaderboard update
```

---

# 📂 Database Structure

```text
betting-db/
├── users
├── races
├── trainers
├── umas
├── bets
├── transactions
└── leaderboards
```

---

# 📊 Core Data Models

## User

| Field | Type | Description |
|---|---|---|
| ticketCode | string | Mã vé liên kết |
| username | string | Tên hiển thị |
| tier | string | Hạng vé |
| startingPoints | number | Điểm khởi đầu |
| currentPoints | number | Điểm hiện tại |
| totalBet | number | Tổng điểm đã cược |
| totalPayout | number | Tổng payout |

---

## Race

| Field | Type | Description |
|---|---|---|
| raceName | string | Tên race |
| state | enum | Trạng thái race |
| startTime | Date | Thời gian bắt đầu |
| closeBetTime | Date | Thời gian khóa cược |
| result | object | Kết quả race |

---

## Bet

| Field | Type | Description |
|---|---|---|
| category | enum | Loại cược |
| prediction | object | Nội dung dự đoán |
| amount | number | Số điểm cược |
| oddAtBetTime | number | Odd tại thời điểm cược |
| payout | number | Điểm nhận được |
| status | enum | Trạng thái cược |

---

# 🔌 API Endpoints

## Authentication

| Endpoint | Purpose |
|---|---|
| `POST /auth/login-ticket` | Đăng nhập bằng ticketCode |
| `GET /auth/me` | Lấy profile người dùng |

---

## Betting

| Endpoint | Purpose |
|---|---|
| `GET /races` | Danh sách race |
| `GET /races/:id` | Chi tiết race |
| `POST /bets/place` | Đặt cược |
| `GET /bets/history` | Lịch sử cược |

---

## Leaderboard

| Endpoint | Purpose |
|---|---|
| `GET /leaderboard/income` | Leaderboard income |
| `GET /leaderboard/roi` | Leaderboard ROI |
| `GET /leaderboard/points` | Leaderboard points |

---

## Admin

| Endpoint | Purpose |
|---|---|
| `POST /admin/races` | Tạo race |
| `PATCH /admin/races/:id/state` | Đổi trạng thái race |
| `PATCH /admin/races/:id/result` | Nhập kết quả race |
| `POST /admin/races/:id/settle` | Settlement payout |

---

# ⚡ WebSocket Events

| Event | Purpose |
|---|---|
| `race:update` | Cập nhật race |
| `bet:update` | Cập nhật betting % |
| `leaderboard:update` | Cập nhật leaderboard |
| `user:point` | Cập nhật điểm người dùng |
| `top-pick:update` | Cập nhật top predicted Uma |

---

# 📂 Recommended Folder Structure

```text
betting-platform/
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── races/
│   │   │   ├── bets/
│   │   │   ├── settlement/
│   │   │   ├── leaderboard/
│   │   │   └── websocket/
│   │   ├── models/
│   │   ├── middleware/
│   │   └── app.ts
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── services/
│   ├── hooks/
│   ├── stores/
│   └── socket/
│
└── README.md
```

---

# 🚀 Deployment

| Thành phần | Platform |
|---|---|
| Frontend | Vercel |
| Backend | Railway |
| Database | MongoDB Atlas |

---

# 🛠️ Tech Stack

## Frontend

- Next.js
- TailwindCSS
- Socket.IO Client
- Zustand
- React Query
- Framer Motion

---

## Backend

- Node.js
- Express.js
- Socket.IO
- MongoDB + Mongoose
- JWT Authentication
- Helmet
- Rate Limiting

---

# 🔐 Security

- JWT Authentication
- MongoDB Transaction
- Rate Limiting
- Helmet Security
- Socket Authentication
- Backend Validation
- Atomic Betting Transaction

---

# 📜 License

Toàn bộ hệ thống được phát triển phục vụ cho hoạt động giải đấu Umamusume nội b