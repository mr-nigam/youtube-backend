import ApiError from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary , deleteFromCloudinary} from "../utils/cloudinary.js";
import mongoose, {isValidObjectId} from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";

// import all models
import { Video } from "../models/video.models.js";
import { Like } from "../models/like.models.js";
import { Comment } from "../models/comment.models.js";
import { Playlist } from "../models/playlist.models.js";
import { WatchHistory } from "../models/watchHistory.models.js";
import { User } from "../models/user.models.js";


const formattedVideo = (video,user)=>({
    id: video._id,
    videoUrl: video.videoUrl,
    thumbnailUrl: video.thumbnailUrl,
    title: video.title,
    description: video.description,
    duration: video.duration,
    views: video.views,
    isPublished: video.isPublished,
    owner:{
        _id: user._id,
        avatar: user.avatar,
        username: user.username 
    },
    tags: video.tags,
    createdAt: video.createdAt
});

const uploadVideo = asyncHandler(async (req,res) =>{
    const {tags} = req.body;
    const title = req.body.title?.replace(/"/g, "").trim();
    const description = req.body.description?.replace(/"/g, "").trim();
    
    if(!title || !description){
        throw new ApiError(400,"Please provide full data");
    }

    const localThumbPath = req.files?.thumbnail?.[0]?.path;
    const localFilePath = req.files?.videoFile?.[0]?.path;

    if(!localThumbPath || !localFilePath){
        throw new ApiError(400,"Thumbnail and video are required");
    }


    let thumbnail = null;
    let videoFile = null;
    try{

        [thumbnail,videoFile] = await Promise.all([
            uploadOnCloudinary(localThumbPath),
            uploadOnCloudinary(localFilePath)  
        ]);


        if(!thumbnail?.public_id){
            throw new ApiError(500, "Thumbnail upload failed");        
        }
        
        if(!videoFile?.public_id){
            throw new ApiError(500, "Video upload failed");        
        }


       const processedTags = tags
            ? [...new Set(
                tags
                    .split(",")
                    .map(tag =>
                        tag.trim()
                           .replace(/"/g, "")
                           .toLowerCase()
                    )
                    .filter(Boolean)
              )]
            : [];

        const video = await Video.create({
            cloudinaryPublicFileId: videoFile.public_id,
            cloudinaryPublicThumbnailId: thumbnail.public_id,
            videoUrl: videoFile.secure_url,
            thumbnailUrl: thumbnail.secure_url,
            title: title,
            duration: videoFile.duration,
            size: videoFile.bytes,
            owner: req.user._id,
            description: description,
            tags: processedTags
        });

        return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                formattedVideo(video,req.user),
                "Video uploaded successfully"
            )
        );

    }catch(err){
        // rollback cloudinary  
        if(thumbnail?.public_id){
            await deleteFromCloudinary(thumbnail.public_id,"image");
        }
        if(videoFile?.public_id){
            await deleteFromCloudinary(videoFile.public_id,"video");
        }
        throw new ApiError(500, err.message || "Video upload failed");
    }
});

const getVideo = asyncHandler(async (req,res) =>{
    const {videoId} = req.params;

    if(!videoId || !isValidObjectId(videoId)){
        throw new ApiError(400,"Video id is missing");
    }

    const video = await Video.findByIdAndUpdate(
        videoId,    
        { $inc: {views: 1}},
        { new : true }
    )
    .populate("owner", "username avatar")
    .lean();
    
    if(!video){
        throw new ApiError(404,"Video not found");
    }

    // Increment channel total views
    await User.findByIdAndUpdate(video.owner._id, {
        $inc: { totalViews: 1 },
        
    });

    const comments = await Comment.find(
        {item: videoId, onModel: "Video"}
    )
    .select("_id conent owner")
    .populate("owner", "username avatar")
    .lean();

    const likecount = await Like.countDocuments(
        {item: videoId, onModel: "Video"}
    );

    const history = await WatchHistory.findOneAndUpdate(
        {
            watchedBy: req.user._id,
            video: video._id,
        },
        {
            $set: {
                watchedAt: new Date()
            },
            $setOnInsert: {
                watchedBy: req.user._id,
                video: video._id,
            }
        },
        {
            upsert: true,
            new: true
        }
    );

    //console.log(history);
    
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    videoList: formattedVideo(video,video.owner),
                    comments: comments,
                    likecount: likecount
                },
                "Video fetched successfully"
            )
        );
});

const changeThumbnail = asyncHandler(async (req, res) => {
    const newThumbnailLocalPath = req.file?.path;

    if (!newThumbnailLocalPath) {
        throw new ApiError(400, "Please upload new thumbnail");
    }

    // already validated in middleware
    const storedVideo = req.storedVideo;

    const oldThumbnailId = storedVideo.cloudinaryPublicThumbnailId;

    let newThumbnail;

    try {
        // 1. Upload new thumbnail
        newThumbnail = await uploadOnCloudinary(
            newThumbnailLocalPath
        );

        if (!newThumbnail?.public_id) {
            throw new ApiError(
                500,
                "Failed to upload new thumbnail"
            );
        }

        // 2. Update database
        storedVideo.cloudinaryPublicThumbnailId =
            newThumbnail.public_id;

        storedVideo.thumbnailUrl =
            newThumbnail.secure_url;

        await storedVideo.save({
            validateBeforeSave: false
        });

        // 3. Delete old thumbnail after success
        if (
            oldThumbnailId &&
            oldThumbnailId !== newThumbnail.public_id
        ) {
            try {
                await deleteFromCloudinary(
                    oldThumbnailId,
                    "image"
                );
            } catch (error) {
                console.error(
                    "Old thumbnail delete failed:",
                    error.message
                );
            }
        }

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    thumbnail:
                        storedVideo.thumbnailUrl
                },
                "Thumbnail updated successfully"
            )
        );
    } catch (error) {
        // rollback newly uploaded image if DB save failed
        if (newThumbnail?.public_id) {
            try {
                await deleteFromCloudinary(
                    newThumbnail.public_id,
                    "image"
                );
            } catch {}
        }

        throw new ApiError(
            500,
            error.message ||
                "Failed to update thumbnail"
        );
    }
});

const updateVideoDetails = asyncHandler(async (req,res) =>{
    const tags = req.body.tags;
    const title = req.body.title?.replace(/"/g, "").trim();
    const description = req.body.description?.replace(/"/g, "").trim();

    if(!title && !description && !tags){
        throw new ApiError(400,"No details provided ");
    }

    const updateFields = {};

    if (title) {
        updateFields.title = title;
    }

    if (description) {
        updateFields.description = description;
    }

    if (tags) {
        updateFields.tags = [
            ...new Set(
                tags
                    .split(",")
                    .map(tag =>
                        tag
                            .replace(/"/g, "")
                            .trim()
                            .toLowerCase()
                    )
                    .filter(Boolean)
            )
        ];
    }

    
    const updatedVideo =
        await Video.findByIdAndUpdate(
            req.storedVideo._id,
            {
                $set: updateFields
            },
            {
                new: true,
                runValidators: true
            }
        );

    if(!updatedVideo){
        throw new ApiError(404, "Video not found" );
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                formattedVideo(updatedVideo,req.user),
                "Details updated successfully"
            )
        );
});

const deleteVideo = asyncHandler(async (req, res) => {
    const video = req.storedVideo;
    const videoId = req.storedVideo._id;

    const session = await mongoose.startSession();

    const PublicVideoFileId = video.cloudinaryPublicFileId
    const PublicThumbnailId = video.cloudinaryPublicThumbnailId;
    
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
            if(PublicVideoFileId){
                await deleteFromCloudinary(PublicVideoFileId,"video");
            }
            if(PublicThumbnailId){
                await deleteFromCloudinary(PublicThumbnailId);   
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
    limit = Math.min(parseInt(limit, 10) || 10, 25);
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

    const videos = await Video.find(filters)
        .select("_id owner title thumbnail views duration")
        .populate("owner", "_id username avatar")
        .sort(title ? { score: { $meta: "textScore" } } : sortOptions)
        .skip(skip)
        .limit(limit)
        .lean();

    const totalVideos = await Video.countDocuments(filters);
    
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



