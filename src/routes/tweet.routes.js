import Router from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";

import {
    getUserTweets,
    getMyTweets,
    createTweet,
    updateTweet,
    deleteTweet,
    getTweet
} from "../controllers/tweet.controller.js";

const router = Router();


// public tweets
router.route("/u/:accountId").get(getUserTweets);


// protected endpoints
router.use(verifyJWT);

router.route("/me").get(getMyTweets);

router.route("/").post(createTweet);

router.route("/:tweetId")
    .get(getTweet)
    .patch(updateTweet)
    .delete(deleteTweet);


export default router;