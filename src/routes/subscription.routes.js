import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";

import {
    toggleSubscription,
    getSubscribers,
    getSubscribedChannels,
} from "../controllers/subscription.controller.js";


const router = Router();


router.use(verifyJWT);

// specific routes first
router.route("/subscribed")
    .get(getSubscribedChannels);
    
router.route("/subscribed/:subscriber")
    .get(getSubscribedChannels);

// dynamic route last
router.route("/:channelId")
    .post(toggleSubscription)
    .get(getSubscribers);


export default router;

