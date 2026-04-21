import Router from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";

import {
    createPlaylist, 
    getPlaylist,
    getPlaylists,
    getPlaylistsByChannel,
    addVideoToPlaylist,
    updatePlaylist,
    deletePlaylist,
    removeVideoFromPlaylist,
    getSearchedPlaylists
} from "../controllers/playlist.controller.js";


const router = Router();


router.use(verifyJWT);


// 📁 Playlists
router.route("/")
    .post(createPlaylist)
    .get(getSearchedPlaylists);

router.route("/me/")
    .get(getPlaylists);

router.route("/:playlistId")
    .get(getPlaylist)
    .patch(updatePlaylist)
    .delete(deletePlaylist);

router.route("/channels/:channelId")
    .get(getPlaylistsByChannel);


// // video id is in body
// router.route("/:playlistId/videos")
//     .post(addVideoToPlaylist);

router.route("/:playlistId/videos/:videoId")
    .post(addVideoToPlaylist)
    .delete(removeVideoFromPlaylist);    



export default router;