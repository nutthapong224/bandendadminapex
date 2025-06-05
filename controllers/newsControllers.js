const pool = require('../config/db'); // เชื่อมต่อฐานข้อมูล MySQL
const multer = require('multer');
const path = require('path');
const fs = require("fs");
const { promisify } = require('util');

// Promisify pool.query for async/await usage
const query = promisify(pool.query).bind(pool);

const uploadsDir = path.join(__dirname, "../uploads");

// Create the uploads directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage to save files with unique names
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir); // Save files to the 'uploads' directory
  },
  filename: (req, file, cb) => {
    // Generate a unique filename using timestamp and random string, retaining the original file extension
    const uniqueSuffix = Date.now() + '-' + Math.random().toString(36).substring(2, 15);
    const fileExtension = path.extname(file.originalname); // Get the file's extension
    const filename = `${uniqueSuffix}${fileExtension}`;
    cb(null, filename); // Set the unique filename
  },
});

// File filter to allow only specific file types (JPEG, PNG, PDF)
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only JPEG, PNG, and PDF are allowed."), false);
  }
};

// Multer setup for handling file uploads
exports.upload = multer({ storage, fileFilter });

exports.getcategorynews = async (req, res) => {
  try {
    const results = await query('SELECT * FROM master_cate_news');
    return res.status(200).json(results);
  } catch (err) {
    return res.status(500).json({ message: 'Database query failed', error: err });
  }
};
exports.addnews = async (req, res) => {
  const {
    topic,
    content,
    cate_news_id,
    attachment_id,
    pin = 0,
    hide = 0,
    status = 'ACTIVE',
    create_name = null,
    modify_name = null
  } = req.body;

  try {
    // ตรวจสอบหมวดหมู่
    const [cateResult] = await pool.query(
      'SELECT cate_news_id FROM master_cate_news WHERE cate_news_id = ?',
      [cate_news_id]
    );

    if (cateResult.length === 0) {
      return res.status(400).json({ error: 'ไม่พบหมวดหมู่ข่าวที่เลือก' });
    }

    let finalAttachmentId = attachment_id;

    // แก้ตรงนี้ให้ใช้ req.files ตามที่ multer fields กำหนด
    let uploadedFile = null;
    if (req.files && req.files['file_name'] && req.files['file_name'][0]) {
      uploadedFile = req.files['file_name'][0].filename;
    }
    let filePath = uploadedFile ? `/uploads/${uploadedFile}` : null;

    // ถ้ายังไม่มี attachment_id ให้สร้างใหม่
    if (!finalAttachmentId) {
      const [insertAttachment] = await pool.query(
        `INSERT INTO attachment (create_name, modify_name) VALUES (?, ?)`,
        [create_name, modify_name]
      );
      finalAttachmentId = insertAttachment.insertId;

      if (uploadedFile) {
        await pool.query(
          `UPDATE attachment SET file_name = ?, file_path = ?, modify_name = ? WHERE attachment_id = ?`,
          [uploadedFile, filePath, modify_name, finalAttachmentId]
        );
      }
    }

    // บันทึกข่าว
    const insertNewsQuery = `
      INSERT INTO news (topic, content, cate_news_id, attachment_id, pin, hide, status, create_date, modify_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    const [newsResult] = await pool.query(insertNewsQuery, [
      topic,
      content,
      cate_news_id,
      finalAttachmentId,
      pin,
      hide,
      status
    ]);

    return res.status(200).json({
      message: 'เพิ่มข้อมูลข่าวสำเร็จ',
      insertedId: newsResult.insertId,
      attachment_id: finalAttachmentId,
      data: {
        id: newsResult.insertId,
        topic,
        content,
        cate_news_id,
        attachment_id: finalAttachmentId,
        file_name: uploadedFile,
        file_path: filePath,
        pin,
        hide,
        status,
        create_name,
        modify_name
      }
    });

  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเพิ่มข่าว', detail: err.message });
  }
};

exports.updatenews = async (req, res) => {
  const newsId = req.params.id; // รับ ID จาก URL parameter
  const {
    topic,
    content,
    cate_news_id,
    attachment_id,
    pin = 0,
    hide = 0,
    status = 'ACTIVE',
    modify_name = null
  } = req.body;

  try {
    // ตรวจสอบว่าข่าวที่ต้องการแก้ไขมีอยู่หรือไม่
    const [existingNews] = await pool.query(
      'SELECT * FROM news WHERE id = ?',
      [newsId]
    );

    if (existingNews.length === 0) {
      return res.status(404).json({ error: 'ไม่พบข่าวที่ต้องการแก้ไข' });
    }

    // ตรวจสอบหมวดหมู่ (ถ้ามีการส่ง cate_news_id มา)
    if (cate_news_id) {
      const [cateResult] = await pool.query(
        'SELECT cate_news_id FROM master_cate_news WHERE cate_news_id = ?',
        [cate_news_id]
      );

      if (cateResult.length === 0) {
        return res.status(400).json({ error: 'ไม่พบหมวดหมู่ข่าวที่เลือก' });
      }
    }

    let finalAttachmentId = attachment_id || existingNews[0].attachment_id;

    // จัดการไฟล์อัปโหลด
    let uploadedFile = null;
    if (req.files && req.files['file_name'] && req.files['file_name'][0]) {
      uploadedFile = req.files['file_name'][0].filename;
    }
    let filePath = uploadedFile ? `/uploads/${uploadedFile}` : null;

    // ถ้ามีไฟล์ใหม่หรือต้องการอัปเดต attachment
    if (uploadedFile || !finalAttachmentId) {
      // ถ้ายังไม่มี attachment_id ให้สร้างใหม่
      if (!finalAttachmentId) {
        const [insertAttachment] = await pool.query(
          `INSERT INTO attachment (create_name, modify_name) VALUES (?, ?)`,
          [existingNews[0].create_name, modify_name]
        );
        finalAttachmentId = insertAttachment.insertId;
      }

      // อัปเดต attachment ถ้ามีไฟล์ใหม่
      if (uploadedFile) {
        await pool.query(
          `UPDATE attachment SET file_name = ?, file_path = ?, modify_name = ? WHERE attachment_id = ?`,
          [uploadedFile, filePath, modify_name, finalAttachmentId]
        );
      }
    }

    // สร้าง query สำหรับอัปเดต (อัปเดตเฉพาะฟิลด์ที่ส่งมา)
    let updateFields = [];
    let updateValues = [];

    if (topic !== undefined) {
      updateFields.push('topic = ?');
      updateValues.push(topic);
    }
    if (content !== undefined) {
      updateFields.push('content = ?');
      updateValues.push(content);
    }
    if (cate_news_id !== undefined) {
      updateFields.push('cate_news_id = ?');
      updateValues.push(cate_news_id);
    }
    if (finalAttachmentId !== undefined) {
      updateFields.push('attachment_id = ?');
      updateValues.push(finalAttachmentId);
    }
    if (pin !== undefined) {
      updateFields.push('pin = ?');
      updateValues.push(pin);
    }
    if (hide !== undefined) {
      updateFields.push('hide = ?');
      updateValues.push(hide);
    }
    if (status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(status);
    }

    // เพิ่ม modify_date และ modify_name เสมอ
    updateFields.push('modify_date = NOW()');
    if (modify_name) {
      updateFields.push('modify_name = ?');
      updateValues.push(modify_name);
    }

    // เพิ่ม newsId ต่อท้าย values สำหรับ WHERE clause
    updateValues.push(newsId);

    const updateNewsQuery = `
      UPDATE news 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;

    const [updateResult] = await pool.query(updateNewsQuery, updateValues);

    if (updateResult.affectedRows === 0) {
      return res.status(400).json({ error: 'ไม่สามารถอัปเดตข่าวได้' });
    }

    // ดึงข้อมูลข่าวที่อัปเดตแล้ว
    const [updatedNews] = await pool.query(
      `SELECT n.*, a.file_name, a.file_path 
       FROM news n 
       LEFT JOIN attachment a ON n.attachment_id = a.attachment_id 
       WHERE n.id = ?`,
      [newsId]
    );

    return res.status(200).json({
      message: 'อัปเดตข้อมูลข่าวสำเร็จ',
      data: {
        id: parseInt(newsId),
        topic: updatedNews[0].topic,
        content: updatedNews[0].content,
        cate_news_id: updatedNews[0].cate_news_id,
        attachment_id: updatedNews[0].attachment_id,
        file_name: updatedNews[0].file_name,
        file_path: updatedNews[0].file_path,
        pin: updatedNews[0].pin,
        hide: updatedNews[0].hide,
        status: updatedNews[0].status,
        modify_date: updatedNews[0].modify_date,
        modify_name: updatedNews[0].modify_name
      }
    });

  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัปเดตข่าว', detail: err.message });
  }
};


exports.getNewsById = async (req, res) => {
  const { id } = req.params;

  try {
    // ตรวจสอบว่า id เป็นตัวเลขหรือไม่
    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'กรุณาระบุ ID ของข่าวที่ถูกต้อง' });
    }

    // ดึงข้อมูลข่าวพร้อมกับข้อมูล attachment และหมวดหมู่
    const getNewsQuery = `
      SELECT 
        n.id,
        n.topic,
        n.content,
        n.cate_news_id,
        n.attachment_id,
        n.pin,
        n.hide,
        n.status,
        n.create_date,
        n.modify_date,
        a.file_name,
        a.file_path,
        a.create_name as attachment_create_name,
        a.modify_name as attachment_modify_name
        
      FROM news n
      LEFT JOIN attachment a ON n.attachment_id = a.attachment_id
      LEFT JOIN master_cate_news c ON n.cate_news_id = c.cate_news_id
      WHERE n.id = ?
    `;

    const [newsResult] = await pool.query(getNewsQuery, [id]);

    // ตรวจสอบว่าพบข่าวหรือไม่
    if (newsResult.length === 0) {
      return res.status(404).json({ error: 'ไม่พบข่าวที่ต้องการ' });
    }

    const newsData = newsResult[0];

    // จัดรูปแบบข้อมูลที่ส่งกลับ
    const responseData = {
      id: newsData.id,
      topic: newsData.topic,
      content: newsData.content,
      cate_news_id: newsData.cate_news_id,
      attachment_id: newsData.attachment_id,
      attachment: newsData.attachment_id ? {
        file_name: newsData.file_name,
        file_path: newsData.file_path,
        create_name: newsData.attachment_create_name,
        modify_name: newsData.attachment_modify_name
      } : null,
      pin: newsData.pin,
      hide: newsData.hide,
      status: newsData.status,
      create_date: newsData.create_date,
      modify_date: newsData.modify_date
    };

    return res.status(200).json({
      message: 'ดึงข้อมูลข่าวสำเร็จ',
      data: responseData
    });

  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ 
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลข่าว', 
      detail: err.message 
    });
  }
};