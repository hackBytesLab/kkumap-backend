// 1. นำเข้า Library ที่จำเป็น
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const cors = require('cors');

// 2. ตั้งค่า Express App
const app = express();
app.use(cors());
app.use(express.json()); 

// 3. ตั้งค่าการเชื่อมต่อฐานข้อมูล MySQL
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'kku_map_daily'
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database.');
});

// --- 4. API Endpoints สำหรับ Users ---
app.post('/register', async (req, res) => {
    try {
        const { username, password, user_type } = req.body;
        if (!username || !password || !user_type) { return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' }); }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = { username: username, password: hashedPassword, user_type: user_type };
        const sql = 'INSERT INTO users SET ?';
        db.query(sql, newUser, (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') { return res.status(409).json({ success: false, message: 'ชื่อผู้ใช้งานนี้มีในระบบแล้ว' }); }
                console.error(err);
                return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการสมัครสมาชิก' });
            }
            res.status(201).json({ success: true, message: 'สมัครสมาชิกสำเร็จ!' });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์' });
    }
});
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) { return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' }); }
    const sql = 'SELECT * FROM users WHERE username = ?';
    db.query(sql, [username], async (err, results) => {
        if (err) { console.error(err); return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์' }); }
        if (results.length === 0) { return res.status(401).json({ success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }); }
        const user = results[0];
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) { return res.status(401).json({ success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }); }
        res.status(200).json({ success: true, message: 'เข้าสู่ระบบสำเร็จ!', user: { id: user.id, username: user.username, user_type: user.user_type } });
    });
});

// --- 5. API Endpoints สำหรับ Places & Contributions ---

// GET /places - ดึงข้อมูลสถานที่ทั้งหมด พร้อมชื่อผู้สร้าง
app.get('/places', (req, res) => {
    const sql = `
        SELECT p.*, u.username AS creator_username
        FROM places p
        JOIN users u ON p.created_by_user_id = u.id
    `;
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching places:', err);
            return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสถานที่' });
        }
        res.status(200).json({ success: true, places: results });
    });
});

// GET /places/:id/contributions - ดึงคอมเมนต์ทั้งหมดของสถานที่นั้นๆ
app.get('/places/:id/contributions', (req, res) => {
    const placeId = req.params.id;
    const sql = `
        SELECT c.*, u.username 
        FROM contributions c
        JOIN users u ON c.user_id = u.id
        WHERE c.place_id = ?
        ORDER BY c.created_at ASC
    `;
    db.query(sql, [placeId], (err, results) => {
        if (err) {
            console.error(`Error fetching contributions for place ${placeId}:`, err);
            return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลคอมเมนต์' });
        }
        res.status(200).json({ success: true, contributions: results });
    });
});

// POST /places - สร้างสถานที่ (หมุด) ใหม่
app.post('/places', (req, res) => {
    const { name, lat, lng, created_by_user_id, comment, image_url } = req.body;
    if (!name || !lat || !lng || !created_by_user_id) {
        return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' });
    }
    db.beginTransaction(err => {
        if (err) { return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์' });}
        const placeSql = 'INSERT INTO places SET ?';
        const placeData = { name, lat, lng, created_by_user_id };
        db.query(placeSql, placeData, (err, result) => {
            if (err) { return db.rollback(() => { res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการบันทึกสถานที่' }); }); }
            const placeId = result.insertId;
            if ((!comment || comment.trim() === '') && !image_url) {
                return db.commit(err => {
                    if (err) { return db.rollback(() => { res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการบันทึก' }); }); }
                    res.status(201).json({ success: true, message: 'สร้างสถานที่ใหม่สำเร็จ!' });
                });
            }
            const contributionSql = 'INSERT INTO contributions SET ?';
            const contributionData = { place_id: placeId, user_id: created_by_user_id, comment: comment || null, image_url: image_url || null };
            db.query(contributionSql, contributionData, (err, result) => {
                if (err) { return db.rollback(() => { res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลเพิ่มเติม' }); }); }
                db.commit(err => {
                    if (err) { return db.rollback(() => { res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการยืนยันข้อมูล' }); });}
                    res.status(201).json({ success: true, message: 'สร้างสถานที่ใหม่สำเร็จ!' });
                });
            });
        });
    });
});

// POST /contributions - เพิ่มคอมเมนต์ใหม่ (หรือตอบกลับ)
app.post('/contributions', (req, res) => {
    const { place_id, user_id, comment, parent_id } = req.body;
    if (!place_id || !user_id || !comment) {
        return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' });
    }
    const newContribution = {
        place_id,
        user_id,
        comment,
        parent_id: parent_id || null
    };
    const sql = 'INSERT INTO contributions SET ?';
    db.query(sql, newContribution, (err, result) => {
        if (err) {
            console.error('Error creating contribution:', err);
            return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการบันทึกคอมเมนต์' });
        }
        res.status(201).json({ success: true, message: 'เพิ่มความคิดเห็นสำเร็จ' });
    });
});

// DELETE /places/:id - ลบสถานที่
app.delete('/places/:id', (req, res) => {
    const placeId = req.params.id;
    const { user_id } = req.body; 
    if (!user_id) {
        return res.status(403).json({ success: false, message: 'ไม่ได้รับอนุญาต' });
    }
    const checkOwnerSql = 'SELECT created_by_user_id FROM places WHERE id = ?';
    db.query(checkOwnerSql, [placeId], (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบสถานที่' });
        }
        const ownerId = results[0].created_by_user_id;
        if (ownerId === user_id) {
            const deleteSql = 'DELETE FROM places WHERE id = ?';
            db.query(deleteSql, [placeId], (err, result) => {
                if (err) {
                    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบ' });
                }
                res.status(200).json({ success: true, message: 'ลบสถานที่สำเร็จ' });
            });
        } else {
            res.status(403).json({ success: false, message: 'คุณไม่ใช่เจ้าของหมุดนี้' });
        }
    });
});

// 6. สั่งให้เซิร์ฟเวอร์เริ่มทำงาน
const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});