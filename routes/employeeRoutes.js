const express = require('express');
const router = express.Router();
const { addEmployee, upload } = require('../controllers/employeesController');

// Employee routes
router.post(
  '/addemployee',
  upload.fields([
    { name: 'file_name', maxCount: 10 }, 
  ]),
 addEmployee
);

module.exports = router;
