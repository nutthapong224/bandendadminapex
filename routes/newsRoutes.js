const express = require('express');
const router = express.Router();
const {getcategorynews,addnews,upload,getNewsById,updatenews} = require('../controllers/newsControllers');


router.get('/getcategorynews/', getcategorynews);
router.get('/getnews/:id', getNewsById);
router.post(
  '/addnews',
  upload.fields([
    { name: 'file_name', maxCount: 1 }, // รองรับการอัปโหลดไฟล์ชื่อ file_name ได้ 1 ไฟล์
  ]),
 addnews
);
router.patch(
  '/updatenews/:id',
  upload.fields([
    { name: 'file_name', maxCount: 1 }, // รองรับการอัปโหลดไฟล์ชื่อ file_name ได้ 1 ไฟล์
  ]),
 addnews
);
module.exports = router;