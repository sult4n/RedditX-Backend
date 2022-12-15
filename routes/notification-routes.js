const express = require("express");
const notificationController = require("../controllers/notification-controller");
const authCheck = require("../middlewares/auth-check");

const router = express.Router();
router.post("/del", authCheck, notificationController.deleteUserNotification);
router
  .route("/history")
  .get(authCheck, notificationController.getNotifications);
  

module.exports = router;
