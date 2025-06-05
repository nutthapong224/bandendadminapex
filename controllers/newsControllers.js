const pool = require('../config/db'); // เชื่อมต่อฐานข้อมูล MySQL
const multer = require('multer');
const path = require('path');


exports.getcategorynews = async (req, res) => {
    try {
      const [results] = await pool.query('SELECT * FROM master_cate_news');
      return res.status(200).json(results);
    } catch (err) {
      return res.status(500).json({ message: 'Database query failed', error: err });
    }
  };