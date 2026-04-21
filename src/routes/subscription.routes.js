import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";

import {
    toggleSubscription,
    getChannelSubscribers,
    getMySubscribers,
    getSubscribedChannels,
    getMySubscribedChannels,
} from "../controllers/subscription.controller.js";


const router = Router();


router.use(verifyJWT);


router.route("/:channelId").post(toggleSubscription);

router.route("/channelId").get(getChannelSubscribers);

router.route("/me/").get(getMySubscribers);

export default router;

