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


router.use(verifyJWT);
// 🔐 Protected routes
router.route("/auth/logout").post(logoutUser);

router.route("/me")
  .get(getCurrentUser)
  .patch(updateAccountDetails)
  .delete(validateDeleteUser, deleteUser);

router.route("/me/password")
  .post(changeCurrentPassword);

router.route("/me/avatar")
  .patch(upload.single("avatar"), updateUserAvatar);

router.route("/me/cover-image")
  .patch(upload.single("coverImage"), updateUserCoverImage);

router.route("/:channelId")
  .get(getChannelProfile);

router.route("/me/watch-history")
  .get(getWatchHistory);


export default router;


// GET /channel        -> my profile
// GET /c/parvesh       -> someone else's channel