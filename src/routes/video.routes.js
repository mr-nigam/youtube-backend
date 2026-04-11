import { Router } from "express";
import {upload} from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { validateVideo } from "../middlewares/videos.middleware.js";


import { 
    uploadVideo,
    changeThumbnail,
    getVideo,
    updateVideoDetails,
    deleteVideo,
} from "../controllers/video.controller.js";


const router = Router();

// console.log("Video routes loaded");

router.route("/upload")
    .post(verifyJWT,
        upload.fields([
            {name: "videoFile", maxCount: 1},
            {name: "thumbnail", maxCount: 1},
        ]),
        uploadVideo
    );


router.route("/:videoId").get(verifyJWT,getVideo);

router.route("/:videoId/thumbnail")
    .patch(verifyJWT, validateVideo,upload.single("thumbnail"),changeThumbnail);

router.route("/:videoId/update")    
    .patch(verifyJWT, validateVideo, updateVideoDetails);

router.route("/:videoId/delete")
    .delete(verifyJWT,validateVideo,deleteVideo);


export default router;