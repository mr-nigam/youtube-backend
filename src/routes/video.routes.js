import { Router } from "express";
import {upload} from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { validateVideo } from "../middlewares/videos.middleware.js";

import {
    uploadVideo,
    getVideo,
    updateVideoDetails,
    deleteVideo,
    changeThumbnail,
    getSearchedVideos,
} from "../controllers/video.controller.js";


const router = Router();


router.use(verifyJWT);


router.route("/")
    .post(upload.fields([
            {name: "videoFile", maxCount: 1},
            {name: "thumbnail", maxCount: 1},
        ]),
        uploadVideo
    );

router.route("/:videoId")
    .get(getVideo)
    .patch(validateVideo, updateVideoDetails)
    .delete(validateVideo,deleteVideo);
    
router.route("/:videoId/thumbnail")
    .patch(validateVideo,upload.single("thumbnail"),changeThumbnail);
    
router.route("/")
    .get(getSearchedVideos)


export default router;