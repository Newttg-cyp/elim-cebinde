const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budgetController');
const { authenticateToken } = require('../controllers/authController');

router.get('/', authenticateToken, budgetController.getBudgets);
router.post('/', authenticateToken, budgetController.setBudget);
router.delete('/', authenticateToken, budgetController.deleteBudget);

module.exports = router;
