const express = require('express');
const router = express.Router();
const {getcategorynews} = require('../controllers/newsControllers');


router.get('/getcategorynews/', getcategorynews);
module.exports = router;