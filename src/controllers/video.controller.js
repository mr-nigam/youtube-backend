import ApiError from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary , deleteFromCloudinary} from "../utils/cloudinary.js";
import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { isValidObjectId } from "mongoose";

// import all models
import { Video } from "../models/video.models.js";
import { Like } from "../models/like.models.js";
import { Comment } from "../models/comment.models.js";
import { Playlist } from "../models/playlist.models.js";
import { WatchHistory } from "../models/watchHistory.models.js";
import { User } from "../models/user.models.js";


const uploadVideo = asyncHandler(async (req,res) =>{
    const {tags} = req.body;
    const title = req.body.title?.replace(/"/g, "").trim();
    const description = req.body.title?.replace(/"/g, "").trim();
    
    if(!title || !description){
        throw new ApiError(400,"Please provide full data");
    }

    const localThumbPath = req.files?.thumbnail?.[0]?.path;
    if(!localThumbPath){
        throw new ApiError(400,"Please upload thumbnail");
    }

    const localFilePath = req.files?.videoFile?.[0]?.path;
    if(!localFilePath){
        throw new ApiError(400,"Please upload video");
    }

    const userId = req.user?._id;
  
    const thumbnail = await uploadOnCloudinary(localThumbPath);
    if(!thumbnail){
        throw new ApiError(500,"Fails on thumbnail upload");        
    }

    const videoFile = await uploadOnCloudinary(localFilePath);
    if(!videoFile){
        throw new ApiError(500,"Fails on video upload");        
    }
    
     const processedTags = tags
        ? tags
            .split(",")
            .map(tag => tag.trim().replace(/"/g, ""))
            .filter(Boolean)
        : [];

    const video = await Video.create({
        cloudinaryPublicFileId: videoFile.public_id,
        cloudinaryPublicThumbnailId: thumbnail.public_id,
        videoUrl: videoFile.secure_url,
        thumbnailUrl: thumbnail.secure_url,
        title: title,
        duration: videoFile.duration,
        size: videoFile.bytes,
        owner: userId,
        description: description,
        tags: processedTags
    });
    
    const populatedVideo = await video.populate("owner", "username avatar");

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                {
                    _id: populatedVideo._id,
                    videoUrl: populatedVideo.videoUrl,
                    thumbnailUrl: populatedVideo.thumbnailUrl,
                    title: populatedVideo.title,
                    description: populatedVideo.description,
                    duration: populatedVideo.duration,
                    views: populatedVideo.views,
                    isPublished: populatedVideo.isPublished,
                    owner: populatedVideo.owner,
                    tags: populatedVideo.tags,
                    createdAt: populatedVideo.createdAt
                },
                "Video uploaded successfully"
            )
        );
});

const getVideo = asyncHandler(async (req,res) =>{
    const {videoId} = req.params;

    if(!videoId){
        throw new ApiError(400,"Video id is missing");
    }
    
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    const video = await Video.findByIdAndUpdate(
        videoId,
        { $inc: {views: 1}},
        {new : true}
    )
        .select("-cloudinaryPublicFileId -cloudinaryPublicThumbnailId -__v")
        .populate("owner", "username avatar")
        .lean();
    
    // 2. Increment channel total views
    await User.findByIdAndUpdate(req.user._id, {
        $inc: { views: 1 }
    });

    if(!video){
        throw new ApiError(404,"Video not found");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                video,
                "Video fetched successfully"
            )
        );
});

const changeThumbnail = asyncHandler(async (req,res) =>{
    const newThumnnailLocalPath = req?.file?.path;
    if(!newThumnnailLocalPath){
        throw new ApiError(400,"upload new thumbnail");
    }
    
    if(!req.storedVideo) {
        throw new ApiError(404, "Video not found");
    }

    //middleware m storedVideo dal denge
    const storedVideo = req.storedVideo;

    const oldThumbnail = storedVideo.cloudinaryPublicThumbnailId;
    
    // 1️⃣ upload new
    const newThumbnail = await uploadOnCloudinary(newThumnnailLocalPath);
    if(!newThumbnail){
        throw new ApiError(500,"Issue in uploading new thumbnail");
    }
    
    // 2️⃣ delete old
    try {
        if (oldThumbnail) {
            await deleteFromCloudinary(oldThumbnail);
        }
    } catch (error) {
        console.error("Failed to delete old thumbnail:", error);
    }

    // 3️⃣ save db
    storedVideo.cloudinaryPublicThumbnailId = newThumbnail.public_id;
    storedVideo.thumbnailUrl = newThumbnail.secure_url;
    await storedVideo.save({ validateBeforeSave: false});
    
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    _id: storedVideo._id,
                    thumbnailUrl: storedVideo.thumbnailUrl,
                    videoUrl: storedVideo.videoUrl,
                    updatedAt: storedVideo.updatedAt
                },
                "Thumbnail updated successfully")
        );
});

const updateVideoDetails = asyncHandler(async (req,res) =>{
    const {tags} = req.body;
    const title = req.body.title?.replace(/"/g, "").trim();
    const description = req.body.description?.replace(/"/g, "").trim();

    if(!title && !description && !tags){
        throw new ApiError(400,"Details are misssing");
    }

    if(!req.storedVideo){
        throw new ApiError(404, "Video not found");
    }
    //middleware m storedVideo dal denge
    const storedVideo = req.storedVideo;

    if(title){
        storedVideo.title = title;
    }
    if(description){
        storedVideo.description = description;
    }

    if(tags){
        storedVideo.tags = tags.split(",")
                .map(tag => tag.replace(/"/g, "")
                .trim()).filter(Boolean);
    }
    await storedVideo.save({validateBeforeSave: false});

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    _id: storedVideo._id,
                    title: storedVideo.title,
                    description: storedVideo.description,
                    tags: storedVideo.tags,
                    thumbnailUrl: storedVideo.thumbnailUrl,
                    videoUrl: storedVideo.videoUrl,
                    updatedAt: storedVideo.updatedAt
                },
                "Details updated successfully"
            )
        );
});

const deleteVideo = asyncHandler(async (req, res) => {
    const videoId = req.storedVideo._id;

    const session = await mongoose.startSession();

    const cloudinaryPublicFileId = videoId.cloudinaryPublicFileId
    const cloudinaryPublicThumbnailId = videoId.cloudinaryPublicThumbnailId;
    try{
        await session.withTransaction(async ()=>{
            await Promise.all([
                Comment.deleteMany({video: videoId}).session(session),
                
                Playlist.updateMany(
                    {videos: videoId},
                    {$pull: {videos: videoId}}
                ).session(session),
                
                Like.deleteMany(
                    {likedItem: videoId, onModel:"Video"}
                ).session(session),

                WatchHistory.deleteMany({video: videoId}).session(session)
            ]);
            
            // delete video
            const deletedVideo = await Video.findByIdAndDelete(videoId).session(session);
            if (!deletedVideo) {
                throw new ApiError(500, "Failed to delete video");
            }
        });
        
        //----- Delete data from clodunary
        try{
            if(cloudinaryPublicFileId){
                await deleteFromCloudinary(cloudinaryPublicFileId,"video");
            }
            if(cloudinaryPublicThumbnailId){
                await deleteFromCloudinary(cloudinaryPublicThumbnailId);   
            }
            console.log("Cloudinary deletion done");
        }catch(err){
            console.error("Cloudinary deletion failed",err.message);
        }

        console.log("Video deleted successfully");
        return res.status(200).json({
            success: true,
            message: "Video and all associated data deleted successfully"
        });

    }catch(error){
        console.error("Deletion failed:", error.message);
        
        throw new ApiError(
            error.statusCode || 500,
            error.message || "Video deletion failed"
        );
    }finally{
        session.endSession();
    }
});

const getSearchedVideos = asyncHandler( async(req,res)=>{
    let { page = 1, limit=10, sortBy, sortType, title, channelId} = req.query;

    page = parseInt(page,10) || 1;
    limit = parseInt(limit,10) || 10;
    const skip = (page-1)*limit;

    sortBy = sortBy?.trim() || "views";

    const sortTypeVal = sortType?.toLowerCase();
    const sortOrder = sortTypeVal === "asc"? 1: -1;

    const filters = {};

    if(channelId){
        if(!isValidObjectId(channelId)){
            throw new ApiError(400, "Invalid owner id");
        }
        filters.owner = channelId;
    }

    if(title){
        filters.$text = {$search: title};
    }
    
    const sortOptions = {
        [sortBy]: sortOrder
    };

    const videos = await Video.find(filter)
        .select("_id owner title thumbnail views duration")
        .populate("owner", "_id username avatar")
        .sort(title ? { score: { $meta: "textScore" } } : sortOptions)
        .skip(skip)
        .limit(limit)
        .lean();

    const totalVideos = await Video.countDocuments(filter);
    
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    success: true,
                    page,
                    limit,
                    totalVideos,
                    totalPages: Math.ceil(totalVideos / limit),
                    data: videos
                },
                `Videoes fetched successfully`
            )
        );
});



export {
    uploadVideo,
    changeThumbnail,
    updateVideoDetails,
    getVideo,
    deleteVideo,
    getSearchedVideos,
}



