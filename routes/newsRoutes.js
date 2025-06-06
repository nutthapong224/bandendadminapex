const express = require('express');
const router = express.Router();
const {getcategorynews,addnews,upload,getNewsById,updatenews,hideNewsById,unhideNewsById,pinNewsById,unpinNewsById,getnewsbyadmin,getnewsbyuser} = require('../controllers/newsControllers');


router.get('/getcategorynews/', getcategorynews);
router.get('/getnews/:id', getNewsById);
router.get('/getnewsbyadmin/', getnewsbyadmin);
router.get('/getnewsbyuser/', getnewsbyuser);
router.put('/pin/:id', pinNewsById);
router.put('/unpin/:id', unpinNewsById);
router.put('/unhide/:id', unhideNewsById);
router.put('/hide/:id', hideNewsById);
router.post(
  '/addnews',
  upload.fields([
    { name: 'file_name', maxCount: 1 }, 
  ]),
 addnews
);


  router.put('/updatenews/:id', upload.fields([
    { name: 'file_name', maxCount: 1 }, 
  ]), updatenews);

    router.put('/updatenews/:id', upload.fields([
    { name: 'file_name', maxCount: 1 }, 
  ]), updatenews);
module.exports = router;