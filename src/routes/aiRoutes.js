const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authenticateToken } = require('../controllers/authController');

router.get('/analysis', authenticateToken, aiController.getFinancialAnalysis);
router.post('/chat', authenticateToken, aiController.chatWithAI);

module.exports = router;
