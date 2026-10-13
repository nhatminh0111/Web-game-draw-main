# DrawGuess

DrawGuess là game vẽ và đoán từ nhiều người chơi theo thời gian thực. Dự án dùng Node.js, Express, Socket.IO và JavaScript thuần.

## Tính năng

- Chơi nhiều người theo phòng.
- Quick Play, tạo phòng riêng và tham gia phòng bằng mã.
- Vẽ trên canvas với màu, kích thước bút và tẩy.
- Chat trong phòng.
- Tính điểm theo tốc độ đoán và nhiều vòng chơi.
- Admin dashboard theo dõi các phòng qua namespace `/admin`.

## Cấu trúc dự án

```text
drawguess-server/       # Backend Express + Socket.IO
  game/                 # Luật chơi và quản lý phòng
  sockets/              # Handler cho /game và /admin
  config/               # Cấu hình server
  index.js              # Điểm khởi động server

drawguess-webapp/       # Web app cho người chơi
  public/
    index.html          # Lobby
    game.html           # Màn hình chơi
    app.js, game.js     # Logic frontend
    config.js            # Xác định URL server

drawguess-admin/        # Admin dashboard chạy độc lập khi phát triển local
render.yaml             # Cấu hình deploy một service lên Render
```

## Yêu cầu

- Node.js 18 trở lên và npm.
- Trình duyệt hiện đại.
- Git chỉ cần khi muốn deploy lên GitHub/Render.

## Chạy local

### Cách nhanh: server phục vụ cả game frontend

```powershell
cd drawguess-server
npm install
npm start
```

Mở <http://localhost:3001>. Backend sẽ phục vụ các file trong `drawguess-webapp/public`.

### Cách tách frontend (tuỳ chọn)

Mở terminal thứ nhất:

```powershell
cd drawguess-server
npm install
npm start
```

Mở terminal thứ hai:

```powershell
cd drawguess-webapp
npm install
npm start
```

Mở <http://localhost:3000>. Khi chạy ở `localhost`, `public/config.js` tự kết nối tới `http://localhost:3001`.

### Chạy admin dashboard (tuỳ chọn)

Mở terminal thứ ba:

```powershell
cd drawguess-admin
npm install
npm start
```

Mở <http://localhost:3002>. Admin mặc định kết nối tới `http://localhost:3001`; có thể đổi URL server bằng `localStorage` với key `dg:server_url`.

## Biến môi trường

Tạo file `.env` trong `drawguess-server` nếu cần thay đổi mặc định:

```env
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

- `PORT`: cổng HTTP của server. Render tự cấp cổng qua biến môi trường.
- `NODE_ENV`: môi trường chạy, thường là `development` hoặc `production`.
- `ALLOWED_ORIGINS`: danh sách origin, phân cách bằng dấu phẩy. Khi frontend chạy riêng, phải thêm đúng URL frontend.

Không commit `.env` hoặc thông tin bí mật.

## Kiểm tra server

Khi server đang chạy, kiểm tra:

- <http://localhost:3001/api> — thông tin API.
- <http://localhost:3001/health> — health check, kết quả mong đợi là `{"status":"healthy"}`.

Sau đó kiểm tra luồng chính: Quick Play, tạo phòng, tham gia phòng, vẽ đồng bộ ở hai tab và chat.

## Deploy lên Render

Repo đã có [`render.yaml`](./render.yaml) để deploy backend và web app cùng một Web Service.

1. Push repo lên GitHub. Có thể dùng `deploy.ps1` hoặc các lệnh Git thông thường.
2. Trong Render Dashboard, chọn **New + → Blueprint** và kết nối repository.
3. Chọn **Apply** để Render đọc `render.yaml`.
4. Chờ service có trạng thái **Live**, sau đó lấy URL service, ví dụ `https://drawguess-game.onrender.com`.
5. Vào **Environment**, đặt `ALLOWED_ORIGINS` bằng URL thật của service, không có dấu `/` ở cuối, rồi lưu để service restart.
6. Kiểm tra lần lượt `/health`, `/api` và trang game. Render free tier có thể mất 30–60 giây để thức dậy sau thời gian không hoạt động.

Sau mỗi lần cập nhật:

```powershell
git add .
git commit -m "Update DrawGuess"
git push
```

Render sẽ tự deploy lại nếu repository đã được kết nối.

> `drawguess-admin` không được service Render chính phục vụ tự động. Nếu cần dùng admin trên production, hãy deploy thư mục này thành một static site riêng và cập nhật URL server trong `localStorage`.

## Giao tiếp mạng

- HTTP/HTTPS: phục vụ HTML, CSS, JavaScript và API.
- Socket.IO: giao tiếp thời gian thực.
- `/game`: namespace cho người chơi.
- `/admin`: namespace cho dashboard quản trị.
- CORS: kiểm soát các origin được phép kết nối.

## License

MIT License.
