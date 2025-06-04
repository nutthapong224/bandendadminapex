 express = require('express');
const { getAllUsers } = require('../controllers/adminapexControllers');

const router = express.Router();

// Admin login route
router.get('/',getAllUsers);



module.exports = router;
