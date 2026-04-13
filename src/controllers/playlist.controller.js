import ApiError from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose, {isValidObjectId} from "mongoose"
import { Playlist } from "../models/playlist.models.js";
import { Video } from "../models/video.models.js";


// LEARN PAGINATION FOR BETTER FETCHINGS

const formatPlaylistResponse = (playlist,user) => ({
    _id: playlist._id,
    name: playlist.name,
    description: playlist.description,
    ...(user && {
        owner: {
            _id: user._id,
            avatar: user.avatar,
            username: user.username,
        }
    }),
    totalVideos: playlist.videos.length,
    createdAt: playlist.createdAt,
    updatedAt: playlist.updatedAt
});

const createPlaylist = asyncHandler( async(req,res) =>{
    const name = req.body?.name?.trim();
    const description = req.body?.description?.trim();

    if(!name || !description){
        throw new ApiError(400,"Please provide both name and description");
    }

    const playlist = await Playlist.create({
        name,
        description,
        owner: req.user._id,
    });

    if(!playlist){  
        throw new ApiError(500,"Playlist creation failed");
    }

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                formatPlaylistResponse(playlist,req.user),
                "Playlist created successfully"
            )
        )
});

const getPlaylist = asyncHandler(async (req,res) =>{
    const {playlistId} = req.params;

    if(!playlistId || !isValidObjectId(playlistId)){
        throw new ApiError(400, "Invalid playlist id");
    }

    const playlist = await Playlist.findOne({
        _id: playlistId,    
        $or: [
            {privacy : "public"},
            {owner:  req.user._id}
        ]
    })
    .populate("owner", "username avatar")
    .lean();

    if(!playlist){
        throw new ApiError(404,"Playlist not found");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                formatPlaylistResponse(playlist, playlist.owner || null),
                "Playlist fetched successfully"
            )
        );
    
});

// User's own playlists
const getPlaylists = asyncHandler(async (req,res) =>{
    const user = req.user;

    const playlists = await Playlist.find({owner: user._id}).lean();

    if(playlists.length === 0){
        throw new ApiError(404,"Playlist not found");
    }

    const formattedPlaylists = playlists.map(pl =>
        formatPlaylistResponse(pl, null)
    );

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    formattedPlaylists,
                    owner: {
                        _id: user._id,
                        username: user.username,
                        avatar: user.avatar
                    }
                },
                "Playlist fetched successfully"
            )
        );
    
});

const getPlaylistsByChannel = asyncHandler( async(req,res)=>{
    const {channelId} = req.params;

    if(!channelId || !isValidObjectId(channelId)){
        throw new ApiError(400, "Invalid channel id");
    }

    const playlists = await Playlist.find({
        owner: channelId,
        privacy: "public"
    })
    .populate("owner","username avatar")
    .lean();

    if (playlists?.length === 0) {
        return res.status(200).json(
            new ApiResponse(200, {owner: null,playlists: []}, "No playlists found")
        );
    }

    const owner = playlists[0].owner;
    
    const formattedPlaylists = playlists.map(pl =>
        formatPlaylistResponse(pl, null)
    );
    
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,{
                    owner,
                    playlists: formattedPlaylists
                },
                "Playlists fetched successfully"
            )
        );

});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params;

    if(!playlistId || !isValidObjectId(playlistId)){
        throw new ApiError(400, "Invalid playlist id");
    }

    if(!videoId || !isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video id");
    }

    const privacy = req.body.privacy?.trim() || "public";
    const videoExists = await Video.exists({ _id: videoId });
    if (!videoExists) {
        throw new ApiError(404, "Video not found");
    }
    
    const updatedPlaylist = await Playlist.findOneAndUpdate(
        {_id: playlistId, owner: req.user._id},
        {
            $addToSet: { videos: videoId},
            ...(privacy && { $set: { privacy } })
        },
        {new: true}
    ).lean();

    if(!updatedPlaylist){
        throw new ApiError(404, "Playlist not found or unauthorized access");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                formatPlaylistResponse(updatedPlaylist,req.user),
                "Video added to playlist successfully"
            )
        );
});

const updatePlaylist = asyncHandler( async (req,res) =>{
    const {playlistId} = req.params;
    
    if(!playlistId || !isValidObjectId(playlistId)){
        throw new ApiError(400, "Invalid playlist id");
    }

    const {name,description} = req.body;
    const newName = name?.trim()|| null;
    const newdescription = description?.trim()|| null;

    if(!newName && !newdescription){
        throw new ApiError(400,"Please provide either name or description");
    }
    
    let updateFields ={};
    if(newName) updateFields.name = newName;
    if(newdescription) updateFields.description = newdescription;

    const playlist = await Playlist.findOneAndUpdate(
        {_id: playlistId, owner: req.user._id},
        { $set: updateFields},
        { new: true}
    ).lean();

    if(!playlist){
        throw new ApiError(404, "Playlist not found or unauthorized access");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                formatPlaylistResponse(playlist,req.user),
                "Playlist updated successfully"
            )
        );
});

const deletePlaylist = asyncHandler( async(req,res) =>{
    const {playlistId} = req.params;

    if(!playlistId || !isValidObjectId(playlistId)){
        throw new ApiError(400, "Invalid playlist id");
    }
    
    const deletedPlaylist  = await Playlist.findOneAndDelete({
        _id: playlistId,
        owner: req.user._id
    });

    if(!deletedPlaylist ){
        throw new ApiError(404, "Playlist not found or unauthorized access");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { deleted: true },
                "Playlist deleted successfully"
            )
        );
});

const removeVideoFromPlaylist = asyncHandler(async(req,res) =>{
    const{playlistId, videoId} = req.params;
    
    if(!playlistId || !isValidObjectId(playlistId)){
        throw new ApiError(400,"Invalid playlist id");
    }
    if(!videoId || !isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid video id");
    }

    const updatedPlaylist = await Playlist.findOneAndUpdate(
        {
            _id: playlistId,
            owner: req.user._id,
            videos: videoId
        },
        {
            $pull: {videos: videoId}
        },
        {new : true}
    ).lean();

    if(!updatedPlaylist ){
        throw new ApiError(404, "Playlist not found, unauthorized, or video not in playlist");   
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                formatPlaylistResponse(updatedPlaylist ,req.user),
                "Video removed from playlist successfully"
            )
        );
        
});


export{
    createPlaylist, 
    getPlaylist,
    getPlaylists,
    getPlaylistsByChannel,
    addVideoToPlaylist,
    updatePlaylist,
    deletePlaylist,
    removeVideoFromPlaylist
}

