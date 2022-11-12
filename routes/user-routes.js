const express = require("express");
const userController = require("../controllers/user-controller");
const profileController = require("../controllers/profile-controller");
const startUploadSinglePhoto = require("../utils/upload-single-photo");
const authCheck = require("../middlewares/auth-check");

const router = express.Router();

router.post(
  "/me/upload-user-photo",
  authCheck,
  startUploadSinglePhoto,
  userController.resizeUserPhoto,
  userController.uploadUserPhoto
);
router.get("/me/prefs", authCheck, userController.getUserPrefs);
router.get("/me", authCheck, userController.getUserMe);

router.get("/:username/about", userController.getUserAbout);

router.post("/block-user", authCheck, userController.block);
router.post("/spam", authCheck, userController.spam);

router.get("/comment/:username", profileController.getUserComments);
router.get("/submitted/:username", profileController.getUserSubmitted);
router.get("/overview/:username", profileController.getUserOverview);
router.get("/upvoted/:username", profileController.getUserUpVoted);
router.get("/downvoted/:username", profileController.getUserDownVoted);

module.exports = router;
