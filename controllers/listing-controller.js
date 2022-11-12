const AppError = require("../utils/app-error");
const catchAsync = require("../utils/catch-async");
const Post = require("../models/post-model");
const Community = require("../models/community-model");
const Comment = require("../models/comment-model");
const User = require("../models/user-model");
const makeRandomString = require("../utils/randomString");
const multer = require("multer");
const APIFeatures = require("../utils/api-features");
const validators = require("./../validate/listing-validators");

/**
 * Name and save the uploaded files
 */
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/posts/files");
  },
  filename: async (req, file, cb) => {
    if (file.mimetype.startsWith("image")) {
      return cb(null, `post-file-${makeRandomString()}-${Date.now()}.jpg`);
    }
    cb(
      null,
      `post-file-${makeRandomString()}-${Date.now()}-${file.originalname}`
    );
  },
});

const upload = multer({
  storage: multerStorage,
});

/**
 * Upload the files
 */
const uploadPostFiles = upload.array("attachments", 10);

/**
 * Creates a post and saves the file names to database
 * @param {function} (req, res, next)
 * @returns {object} res
 */
const submit = catchAsync(async (req, res, next) => {
  req.body.attachments = [];
  if (req.files) {
    req.files.forEach((file) => req.body.attachments.push(file.filename));
  }
  req.body.userID = req.username;
  req.body.voters = [{ userID: req.username, voteType: 1 }];
  const user = await User.findById(req.username);
  if (!user) return next(new AppError("This user doesn't exist!", 404));
  if (req.body.communityID) {
    const community = await Community.findById(req.body.communityID).select(
      "communityOptions"
    );
    if (!community.communityOptions.isAutoApproved) req.body.isPending = true;
  }
  const newPost = await Post.create(req.body);
  user.hasPost.push(newPost._id);
  await user.save();
  res.status(201).json(newPost);
});

/**
 * User saves a post
 * @param {function} (req, res, next)
 * @returns {object} res
 */
const save = catchAsync(async (req, res, next) => {
  if (!req.body.linkID)
    return next(new AppError("No linkID is provided!", 400));
  const user = await User.findById(req.username);
  if (!user) return next(new AppError("This user doesn't exist!", 404));
  if (user.savedPosts.find((el) => el.toString() === req.body.linkID.slice(3)))
    return res.status(200).json({
      status: "success",
      message: "Post is saved successfully",
    });
  user.savedPosts.push(req.body.linkID.slice(3));
  await user.save();
  res.status(200).json({
    status: "success",
    message: "Post is saved successfully",
  });
});

/**
 * User unsaves a post
 * @param {function} (req, res, next)
 * @returns {object} res
 */
const unsave = catchAsync(async (req, res, next) => {
  if (!req.body.linkID)
    return next(new AppError("No linkID is provided!", 400));
  const user = await User.findById(req.username);
  if (!user) return next(new AppError("This user doesn't exist!", 404));
  user.savedPosts.splice(
    user.savedPosts.findIndex((el) => el === req.body.linkID.slice(3)),
    1
  );
  await user.save();
  res.status(200).json({
    status: "success",
    message: "Post is unsaved successfully",
  });
});

/**
 * Vote over a post or a comment (id and dir must be sent in request body)
 * @param {Object} req request must contain dir and id.
 * @param {Object} res
 * @returns {String} status whether failed or not.
 */
const vote = async (req, res) => {
  if (req.body.id === undefined || req.body.dir === undefined)
    return res.status(500).json({
      status: "invalid id or dir",
    });
  const id = req.body.id.substring(0, 2);
  const dir = req.body.dir;
  const postIdCasted = req.body.id.substring(3);
  const check = validators.validateVoteIn(id, dir, postIdCasted);
  if (!check) {
    return res.status(500).json({
      status: "invalid id or dir",
    });
  }
  if (id === "t3") {
    //post
    const post = await Post.findById(postIdCasted);
    if (!post) {
      return res.status(500).json({
        status: "not found",
      });
    }
    let votesCount = post.votesCount;
    let operation;
    if (dir == 1 || dir == 2) {
      operation = 1;
    } else if (dir == 0 || dir == -1) {
      operation = -1;
    }
    Post.findByIdAndUpdate(
      { _id: postIdCasted },
      { $set: { votesCount: votesCount + operation } },
      { new: true },
      (err, doc) => {
        if (err) {
          return res.status(500).json({
            status: "failed",
          });
        } else {
          return res.status(200).json({
            status: "done",
          });
        }
      }
    );
  } else if (id === "t1") {
    //comment or reply
    const comment = await Comment.findById(postIdCasted);
    if (!comment) {
      return res.status(500).json({
        status: "not found",
      });
    }
    let votesCount = comment.votesCount;
    let operation;
    if (dir == 1 || dir == 2) {
      operation = 1;
    } else if (dir == 0 || dir == -1) {
      operation = -1;
    }
    Comment.findByIdAndUpdate(
      { _id: postIdCasted },
      { $set: { votesCount: votesCount + operation } },
      { new: true },
      (err, doc) => {
        if (err) {
          return res.status(500).json({
            status: "failed",
          });
        } else {
          return res.status(200).json({
            status: "done",
          });
        }
      }
    );
  }
};

/**
 * add subreddit to req if the path of the api has the certain subreddit
 * @param {Object} req the request comes from client and edited by previous middlewares eg. possible-auth-check and contain the username if the user is signed in
 * @param {Object} res the response that will be sent to the client or passed and in this function will passed to next middleware getPosts
 * @param {Function} next the faunction that call the next middleware in this case getPosts
 * @returns {void}
 */
const addSubreddit = (req, res, next) => {
  if (req.params.subreddit)
    req.addedFilter = { communityID: req.params.subreddit };
  next();
};

/**
 * get posts from the database based on the subreddits and friends of the signed in user if this is exist and based on criteria also and if it isn't will return based on criteria only
 * @param {Function} (req,res,next)
 * @param {Object} req the request comes from client and edited by previous middlewares eg. possible-auth-check and addSubreddit and contain the username and the subreddit
 * @param {Object} res the response that will be sent to the client
 * @returns {void}
 */
const getPosts = catchAsync(async (req, res, next) => {
  /*first of all : check if the request has certain subreddit or not*/
  if (!req.addedFilter) {
    /* here the request dosn't contain certain subreddit then we will get the posts from friends and subreddits and persons teh user follow*/

    /* if user signed in we will do the following
    1.get the categories of the user
    2. get the friends of the user
    3. get the posts based on these categories and the users*/
    if (req.username) {
      /*step 1,2 :get the categories and friends of the user*/
      const { member, friend, follows } = await User.findById(
        req.username
      ).select("-_id member friend follows");
      const subreddits = member.map((el) => {
        if (!el.isBanned) {
          return el.communityId;
        }
      });
      /* step 3 :add the subreddits to addedFilter*/
      req.addedFilter = {
        $or: [
          {
            communityID: {
              $in: subreddits,
            },
          },
          {
            userID: {
              $in: friend,
            },
          },
          {
            userID: {
              $in: follows,
            },
          },
        ],
      };
    }
  }
  let sort = {};
  if (req.params.criteria) {
    if (req.params.criteria === "best")
      sort = {
        bestFactor: -1,
      };
    else if (req.params.criteria === "hot")
      sort = {
        hotnessFactor: -1,
      };
    else if (req.params.criteria === "new") {
      sort = {
        createdAt: -1,
      };
    } else if (req.params.criteria === "top")
      sort = {
        votesCount: -1,
      };
    else if (req.params.criteria === "random") {
      sort = {};
    } else {
      /*if the request has any other criteria */
      return next(new AppError("not found this page", 404));
    }
  }
  const features = new APIFeatures(
    Post.find(req.addedFilter, null, { sort }),
    req.query
  )
    .filter()
    .paginate()
    .sort()
    .selectFields();
  const posts = await features.query;
  res.status(200).json({
    status: "succeeded",
    posts,
  });
});

module.exports = {
  uploadPostFiles,
  submit,
  save,
  unsave,
  addSubreddit,
  getPosts,
  vote,
};