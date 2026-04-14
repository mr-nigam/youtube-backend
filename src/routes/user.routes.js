import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {validateDeleteUser} from "../middlewares/delete_user.middleware.js";

import { 
        loginUser, 
        logoutUser, 
        registerUser, 
        refreshAccessToken,
        changeCurrentPassword,
        getCurrentUser,
        updateAccountDetails,
        updateUserAvatar,
        updateUserCoverImage,
        getChannelProfile,
        getWatchHistory,
        deleteUser
} from "../controllers/user.controller.js";


const router = Router();


// 🔓 Public routes
router.route("/auth/register").post(
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 }
  ]),
  registerUser
);

router.route("/auth/login").post(loginUser);

router.route("/auth/refresh-token").post(refreshAccessToken);


// 🔐 Protected routes
router.route("/auth/logout").post(verifyJWT, logoutUser);

router.route("/me")
  .get(verifyJWT, getCurrentUser)
  .patch(verifyJWT, updateAccountDetails)
  .delete(verifyJWT, validateDeleteUser, deleteUser);

router.route("/me/password")
  .post(verifyJWT, changeCurrentPassword);

router.route("/me/avatar")
  .patch(verifyJWT, upload.single("avatar"), updateUserAvatar);

router.route("/me/cover-image")
  .patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage);

router.route("/:channelId")
  .get(verifyJWT, getChannelProfile);

router.route("/me/watch-history")
  .get(verifyJWT, getWatchHistory);


export default router;


// GET /channel        -> my profile
// GET /c/parvesh       -> someone else's channel