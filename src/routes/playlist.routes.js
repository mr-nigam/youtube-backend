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
    getPlaylistsUniversal
} from "../controllers/playlist.controller.js";


const router = Router();


router.use(verifyJWT);


// 📁 Playlists
router.route("/")
    .post(createPlaylist)
    .get(getPlaylistsUniversal);

router.route("/:playlistId")
    .get(getPlaylist)
    .patch(updatePlaylist)
    .delete(deletePlaylist);

router.route("/channels/:channelId")
    .get(getPlaylistsByChannel);

router.route("/me/")
    .get(getPlaylists);

// video id is in body
router.route("/:playlistId/videos")
    .post(addVideoToPlaylist);

router.route("/:playlistId/videos/:videoId")
    .delete(removeVideoFromPlaylist);    



export default router;