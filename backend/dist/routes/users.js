"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userController_1 = require("../controllers/userController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const userController = new userController_1.UserController();
// All user routes require authentication
router.use(auth_1.authenticateToken);
// GET /api/users/me - Get current user profile
router.get('/me', userController.getProfile.bind(userController));
// PATCH /api/users/me - Update user profile
router.patch('/me', userController.updateProfile.bind(userController));
// POST /api/users/me/change-email - Change user email
router.post('/me/change-email', userController.changeEmail.bind(userController));
// POST /api/users/me/verify-email-change - Verify email change
router.post('/me/verify-email-change', userController.verifyEmailChange.bind(userController));
// POST /api/users/me/change-password - Change user password
router.post('/me/change-password', userController.changePassword.bind(userController));
// POST /api/users/me/deactivate - Deactivate user account
router.post('/me/deactivate', userController.deactivateAccount.bind(userController));
// DELETE /api/users/me - Delete user account permanently
router.delete('/me', userController.deleteAccount.bind(userController));
// GET /api/users/me/export - Export user data (GDPR compliance)
router.get('/me/export', userController.exportUserData.bind(userController));
// GET /api/users/me/activity - Get user activity history
router.get('/me/activity', userController.getActivityHistory.bind(userController));
exports.default = router;
