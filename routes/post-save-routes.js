const express = require("express");
const postController = require("../controllers/post-controller");

const router = express.Router();

router.post(
  "/",
  /*authController.protect,*/
  postController.save
);

module.exports = router;
