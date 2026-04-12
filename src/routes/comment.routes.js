import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";

import{
    getComments,
    addComment,
    updateComment,
    deleteComment
} from "../controllers/comment.controller.js";

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

// change layout of this
router.route("/:videoId")
    .get(getComments)
    .post(addComment);

router.route("/c/:commentId")
    .patch(updateComment)
    .delete(deleteComment);


export default router;