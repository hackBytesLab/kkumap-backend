# GitHub Pages Static Starter

ไฟล์นี้พร้อมใช้งานกับ GitHub Pages ผ่าน GitHub Actions

## โครงสร้าง
```
.
├─ .github/workflows/pages.yml
└─ site/
   ├─ index.html
   ├─ styles.css
   └─ .nojekyll
```

## วิธี Deploy
1. สร้าง repository (ตั้งค่า default branch = `main`)
2. อัปโหลดโฟลเดอร์ทั้งหมดนี้ขึ้น GitHub
3. ไปที่ **Settings → Pages** แล้วเลือก **Source = GitHub Actions**
4. ทุกครั้งที่ push → Deploy อัตโนมัติ
