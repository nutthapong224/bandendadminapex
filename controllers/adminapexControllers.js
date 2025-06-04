const express = require('express');
const pool = require("../config/db");
const multer = require("multer");

const path = require("path");
const fs = require("fs");

const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir); // Save files to the uploads directory
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.random().toString(36).substring(2, 15);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});




const router = express.Router();









const getAllUsers = async (req, res) => {
  const sql = "SELECT * FROM employees";

  try {
    const [results] = await pool.query(sql);

    if (results.length === 0) {
      return res.status(404).send("No users found.");
    }

    res.status(200).json(results);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching users.");
  }
};


module.exports = {

  getAllUsers

};