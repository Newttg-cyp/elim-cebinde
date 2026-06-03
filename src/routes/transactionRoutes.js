const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { authenticateToken } = require('../controllers/authController');

router.get('/', authenticateToken, transactionController.getTransactions);
router.post('/', authenticateToken, transactionController.addTransaction);
router.delete('/:id', authenticateToken, transactionController.deleteTransaction);

module.exports = router;
