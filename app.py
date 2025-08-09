
import os, time
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

app = Flask(__name__)
# 👉 แก้ origins ให้เป็นโดเมน GitHub Pages ของคุณ
CORS(app, resources={r"/*": {"origins": ["https://<username>.github.io", "http://127.0.0.1:5000"]}})

# ===== Static demo data =====
ROUTES = [
  {"id":"RED","name":"สายสีแดง","color":"#E53935",
   "shape":[[16.4761,102.8232],[16.4752,102.8241],[16.4748,102.8252],[16.4745,102.8246]]},
  {"id":"BLUE","name":"สายสีน้ำเงิน","color":"#1E88E5",
   "shape":[[16.4771,102.8227],[16.4762,102.8234],[16.4753,102.8239],[16.4749,102.8244]]}
]
STOPS = {
  "RED":[{"id":"S1","name":"คณะวิศวฯ","lat":16.4763,"lng":102.8232},
         {"id":"S2","name":"ห้องสมุด","lat":16.4755,"lng":102.8248}],
  "BLUE":[{"id":"S3","name":"สนามกีฬา","lat":16.4770,"lng":102.8229},
          {"id":"S4","name":"คณะมนุษย์ฯ","lat":16.4757,"lng":102.8236}]
}

@app.get("/routes")
def routes():
    return jsonify({"success": True, "data": ROUTES})

@app.get("/stops")
def stops():
    rid = request.args.get("route_id", ROUTES[0]["id"] if ROUTES else "RED")
    return jsonify({"success": True, "data": STOPS.get(rid, [])})

@app.get("/vehicles")
def vehicles():
    rid = request.args.get("route_id", ROUTES[0]["id"] if ROUTES else "RED")
    path = next((r["shape"] for r in ROUTES if r["id"]==rid), [])
    t = time.time()
    cars = []
    for i, carId in enumerate(["BUS01","BUS02"]):
        idx = int((t/5 + i*7) % max(1,len(path))) if path else 0
        lat, lng = path[idx] if path else (16.475,102.824)
        cars.append({"id":carId,"route_id":rid,"lat":lat,"lng":lng,"heading":90,"speed_kph":18})
    return jsonify({"success":True,"ts":int(t),"data":cars})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
