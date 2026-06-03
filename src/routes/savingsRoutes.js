const express = require('express');
const router = express.Router();
const savingsController = require('../controllers/savingsController');
const { authenticateToken } = require('../controllers/authController');

router.get('/', authenticateToken, savingsController.getSavingsGoals);
router.post('/', authenticateToken, savingsController.addSavingsGoal);
router.patch('/:id', authenticateToken, savingsController.updateSavingsProgress);
router.delete('/:id', authenticateToken, savingsController.deleteSavingsGoal);

module.exports = router;
