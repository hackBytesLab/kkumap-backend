
# Backend (Render/Railway)
Flask API สำหรับ routes/stops/vehicles (เดโม่ตำแหน่งรถวิ่งบนเส้นทาง)

## Deploy บน Render
- New Web Service → จาก GitHub repo นี้
- Build: `pip install -r requirements.txt`
- Start: `gunicorn app:app`
- ใส่ CORS origins ให้เป็นโดเมน GitHub Pages ของคุณใน `app = Flask(__name__)` ส่วน CORS

## Endpoints
- GET /routes
- GET /stops?route_id=RED
- GET /vehicles?route_id=RED

เมื่อต่อกับ Frontend (GitHub Pages) ให้ตั้ง `API_URL` ใน `script.js` ให้ตรงกับ URL ที่ Render ให้มา
