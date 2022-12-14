const AppError = require("../utils/app-error");
const catchAsync = require("../utils/catch-async");
const User = require("./../models/user-model");
const Post = require("./../models/post-model");
const Comment = require("./../models/comment-model");
const Community = require("./../models/community-model");

const PostService = require("./../services/post-service");
const UserService = require("./../services/user-service");
const CommunityService = require("./../services/community-service");
const CommentService = require("./../services/comment-service");

const postServiceInstance = new PostService(Post);
const userServiceInstance = new UserService(User);
const communityServiceInstance = new CommunityService(Community);
const commentServiceInstance = new CommentService(Comment);

/**
 * Get user followers
 * @param {function} (req, res)
 * @returns {object} res
 */
const followers = async (req, res) => {
  console.log(req.username);
  if (!req.username) {
    return res.status(500).json({
      response: "error providing username",
    });
  }
  const result = await userServiceInstance.getFollowers(req.username);
  return res.status(200).json({
    response: "done",
    followers: result.followers,
  });
};
/**
 * Get user interests
 * @param {function} (req, res)
 * @returns {object} res
 */
const getInterests = async (req, res) => {
  console.log(req.username);
  if (!req.username) {
    return res.status(500).json({
      response: "error providing username",
    });
  }
  const result = await userServiceInstance.getInterests(req.username);

  if (result.status) {
    return res.status(200).json({
      response: "done",
      categories: result.categories,
    });
  } else {
    return res.status(500).json({
      response: "operation failed",
    });
  }
};

/**
 * Add user interests
 * @param {function} (req, res)
 * @returns {object} res
 */
const addInterests = async (req, res) => {
  console.log(req.username);
  if (!req.username || !req.body.categories) {
    return res.status(500).json({
      response: "error providing username",
    });
  }
  const result = await userServiceInstance.addInterests(
    req.username,
    req.body.categories
  );
  if (result.status) {
    return res.status(200).json({
      response: "done",
    });
  } else {
    return res.status(500).json({
      response: "operation failed",
    });
  }
};

/**
 * Update user email
 * @param {function} (req, res)
 * @returns {object} res
 */
const updateEmail = async (req, res) => {
  if (!req.username || !req.body.email)
    return res.status(400).json({
      response: "invaild parameters",
    });
  const results = await userServiceInstance.updateOne(
    { _id: req.username },
    { email: req.body.email }
  );
  if (!results)
    return res.status(400).json({
      response: "error",
    });
  return res.status(200).json({
    response: results,
  });
};
/**
 * Saves filename to database
 * @param {function} (req, res, next)
 * @returns {object} res
 */
const uploadUserPhoto = catchAsync(async (req, res, next) => {
  var avatar = undefined;
  try {
    avatar = await userServiceInstance.uploadUserPhoto(
      req.body.action,
      req.username,
      req.file
    );
  } catch (err) {
    return next(err);
  }
  res.status(200).json({
    status: "success",
    avatar,
  });
});

/**
 * Blocks another user
 * @param {function} (req, res, next)
 * @returns {object} res
 */
const block = catchAsync(async (req, res, next) => {
  try {
    await userServiceInstance.block(
      req.username,
      req.body.userID,
      req.body.action
    );
  } catch (err) {
    return next(err);
  }
  res.status(200).json({
    status: "success",
    message: "Blocks are updated successfully",
  });
});

/**
 * Spams a post or a comment
 * @param {function} (req, res, next)
 * @returns {object} res
 */
const spam = catchAsync(async (req, res, next) => {
  if (!req.body.linkID)
    return next(new AppError("No linkID is provided!", 400));
  var community = undefined;
  try {
    if (req.body.linkID[1] === "3") {
      // Spam a post
      const post = await postServiceInstance.getOne({
        _id: req.body.linkID.slice(3),
      });
      if (!post) return new AppError("This post doesn't exist!", 404);
      if (post.communityID !== undefined && post.communityID !== "")
        community = await communityServiceInstance.getOne({
          _id: post.communityID,
          select: "communityOptions",
        });
      postServiceInstance.spamPost(
        post,
        req.body.spamType,
        req.body.spamText,
        req.username,
        community
      );
    } else {
      // Spam a comment
      var comment = await commentServiceInstance.getOne({
        _id: req.body.linkID.slice(3),
      });
      if (!comment)
        return next(new AppError("This comment doesn't exist!", 404));
      comment = await commentServiceInstance.spamComment(
        comment,
        req.body.spamType,
        req.body.spamText,
        req.username
      );
      const post = await postServiceInstance.getOne({
        _id: comment.replyingTo,
        select: "communityID",
      });
      if (post && post.communityID !== undefined && post.communityID !== "")
        community = await communityServiceInstance.getOne({
          _id: post.communityID,
          select: "communityOptions",
        });
      await commentServiceInstance.saveSpammedComment(comment, community);
    }
  } catch (err) {
    return next(err);
  }
  res.status(200).json({
    status: "success",
    message: "Spams are updated successfully",
  });
});
/**
 * Get user prefs
 * @param {function} (req,res)
 * @returns {object} res
 */
const getUserPrefs = catchAsync(async (req, res, next) => {
  var prefs = undefined;
  try {
    const user = await userServiceInstance.findById(req.username);
    prefs = await communityServiceInstance.userPrefs(user);
  } catch (err) {
    return next(err);
  }
  res.status(200).json({
    prefs,
  });
});

/**
 * Get user about
 * @param {function} (req,res)
 * @returns {object} res
 */
const getUserAbout = catchAsync(async (req, res, next) => {
  var about = undefined;
  try {
    const user = await userServiceInstance.findById(req.username);
    about = await communityServiceInstance.userAbout(user);
  } catch (err) {
    return next(err);
  }
  res.status(200).json({
    about,
  });
});

/**
 * Get user me info
 * @param {function} (req,,res)
 * @returns {object} res
 */
const getUserMe = catchAsync(async (req, res, next) => {
  var meInfo = undefined;
  try {
    const user = await userServiceInstance.findById(req.username);
    meInfo = await communityServiceInstance.userMe(user);
  } catch (err) {
    return next(err);
  }
  res.status(200).json({
    meInfo,
  });
});

const returnResponse = (res, obj, statusCode) => {
  return res.status(statusCode).json(obj);
};

/**
 * Subscribe to a subreddit or a redditor
 * @param {function} (req,res)
 * @returns {object} res
 */
const subscribe = async (req, res) => {
  if (!req.body.srName || !req.body.action) {
    return returnResponse(res, { error: "invalid inputs" }, 400);
  }
  console.log(req.body);
  console.log(req.username);

  const result = await userServiceInstance.subscribe(req.body, req.username);
  console.log("res", result);
  if (result.state) {
    return res.status(200).json({
      status: "done",
    });
  } else {
    return res.status(404).json({
      status: result.error,
    });
  }
};

const friendRequest = catchAsync((req, res, next) => {
  if (req.body.type === 'friend') {
    userServiceInstance.addFriend(req.name);
  } else if (req.body.type === 'moderator_invite') {
    userServiceInstance.inviteModerator(req.name);
  } else {
    return res.status(400).json({
      status: "failed",
      message: "invalid type"
    })
  }
  return res.status(200).json({
    status: "succeeded",
  });
});

const getAllFriends = catchAsync(async (req, res, next) => {
  const friends = await userServiceInstance.getOne({
    '_id': req.username,
    'select': '-_id friend',
    'populate': {
      'path': 'friend',
      'select': 'avatar about _id'
    }
  });
  res.status(200).json({
    status: "succeeded",
    friends
  });
});


const acceptModeratorInvite = catchAsync(async (req, res, next) => {
  //[1]-> check existence of subreddit
  subreddit = await communityServiceInstance.availableSubreddit(req.params.subreddit);
  if (subreddit.state) {
    return res.status(404).json({
      status: 'failed',
      message: 'not found this subreddit',
    })
  }
  // [2]-> check if the user has been invited to be moderator
  if (!subreddit.subreddit.invitedModerators.includes(req.username)) {
    return res.status(401).json({
      status: 'failed',
      message: 'you aren\'t invited to this subreddit'
    })
  }
  // [3]-> accept the invitation
  //[1] -> update the subreddit invitedModerators
  await communityServiceInstance.removeModeratorInvitation(req.params.subreddit, req.username);
  //[2] -> update the relation of the user moderators
  await userServiceInstance.addSubredditModeration(req.params.subreddit, req.username);
  //[3] -> update the subreddit moderators 
  await communityServiceInstance.addModerator(req.params.subreddit, req.username);
  res.status(200).json({
    status: 'succeded'
  })
});


const updateInfo = catchAsync(async (req, res, next) => {
  const type = req.body.type;
  const permittedChangedVariables = [
    'gender',
    'about',
    'phoneNumber',
    'name',
    'email'
  ]
  if (!permittedChangedVariables.includes(type)) {
    res.status(400).json({
      status: 'failed',
      message: 'wrong entered type'
    });
  }
  //[TODO]: we must check if the new name or email is available in case of changing email and name
  update = {};
  update[type + ''] = req.body.value;
  userServiceInstance.updateOne({ '_id': req.username }, update);
  res.status(200).json({
    status: 'succeeded'
  });
});

const leaveModeratorOfSubredddit = catchAsync(async (req, res, next) => {
  //[1]-> check the existence of the moderator
  subreddit = await communityServiceInstance.availableSubreddit(req.params.subreddit);
  if (subreddit.state) {
    return res.status(404).json({
      status: 'failed',
      message: 'not found this subreddit',
    })
  }
  // [2] -> check if user isn't moderator in subreddit
  if (!await userServiceInstance.isModeratorInSubreddit(req.params.subreddit, req.username)) {
    return res.status(400).json({
      status: 'failed',
      message: 'you aren\'t moderator in this subreddit',
    });
  }
  //[3]-> do leaving the subreddit
  await userServiceInstance.updateOne({ '_id': req.username }, {
    $pull: {
      'moderators': { 'communityId': req.params.subreddit }
    }
  });
  await communityServiceInstance.updateOne({ '_id': req.params.subreddit }, {
    $pull: {
      'moderators': { 'userID': req.username }
    }
  });
  return res.status(200).json({
    status: 'succeded',
  });
})
module.exports = {
  uploadUserPhoto,
  block,
  spam,

  updateEmail,

  returnResponse,

  getUserMe,
  getUserAbout,
  getUserPrefs,
  subscribe,
  friendRequest,
  getAllFriends,
  acceptModeratorInvite,
  updateInfo,
  leaveModeratorOfSubredddit,
  followers,
  getInterests,
  addInterests,
  updateInfo,
};
