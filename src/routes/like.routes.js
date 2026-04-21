import Router from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";

import {
    toggleLike,
    likesDetails,
} from "../controllers/like.controller.js";


const router = Router();


router.use(verifyJWT);

router.route("/:itemId")
    .post(toggleLike)

router.route("/:itemId/details")
    .get(likesDetails)


export default router;