import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.models.js";
import ApiError from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary , deleteFromCloudinary} from "../utils/cloudinary.js";


const uploadVideo = asyncHandler(async (req,res) =>{
    const {title, description, tags} = req.body;

    if(!title?.trim() || !description?.trim()){
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
    if(!userId){
        throw new ApiError(401,"Unauthorized access, please login first");
    }

    const thumbnail = await uploadOnCloudinary(localThumbPath);
    if(!thumbnail){
        throw new ApiError(500,"Fails on thumbnail upload");        
    }

    const videoFile = await uploadOnCloudinary(localFilePath);
    if(!videoFile){
        throw new ApiError(500,"Fails on video upload");        
    }
    
    const video = await Video.create({
        cloudinaryPublicFileId: videoFile.public_id,
        cloudinaryPublicThumbnailId: thumbnail.public_id,
        videoUrl: videoFile.secure_url,
        thumbnailUrl: thumbnail.secure_url,
        title,
        duration: videoFile.duration,
        size: videoFile.bytes,
        owner: userId,
        description: description.replace(/"/g, "").trim(),
        tags: tags ? tags
                .split(",")
                .map(tag => tag.replace(/"/g, "")
                .trim()).filter(Boolean)
                : [],
    });

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                {
                    videoId: video._id,
                    videoUrl: videoFile.secure_url,
                    thumbnailUrl: thumbnail.secure_url,
                    title: video.title,
                    description: video.description,
                    duration: video.duration,
                    views: video.views,
                    isPublished: video.isPublished,
                    owner: video.owner,
                    tags: video.tags,
                    createdAt: video.createdAt
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
    const video = await Video.findById(videoId)
        .select("-cloudinaryPublicFileId -cloudinaryPublicThumbnailId -__v");

    if(!video){
        throw new ApiError(404,"Video not found");
    }

    const { _id, ...rest } = video.toObject();
    const formattedVideo = {
        videoId: _id,
        ...rest
    };

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                formattedVideo,
                "Video fetched successfully"
            )
        );
});

const changeThumbnail = asyncHandler(async (req,res) =>{
    const {videoId} = req.params;
    if(!videoId){
        throw new ApiError(400,"Video id is missing");
    }

    const newThumnnailLocalPath = req?.file?.path;
    if(!newThumnnailLocalPath){
        throw new ApiError(400,"upload new thumbnail");
    }
    
    const storedVideo = await Video.findById(videoId);
    if(!storedVideo){
        throw new ApiError(404,"Video is not in database");
    }
    // owner check
    if(!storedVideo.owner.equals(req.user._id)){
        throw new ApiError(403,"Unauthirized access, you are not the owner");
    }

    const oldThumnail = storedVideo.cloudinaryPublicThumbnailId;
    
    // 1️⃣ upload new
    const newThumbnail = await uploadOnCloudinary(newThumnnailLocalPath);
    if(!newThumbnail){
        throw new ApiError(500,"Issue in uploading new thumbnail");
    }
    
    // 2️⃣ delete old
    await deleteFromCloudinary(oldThumnail);

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
                    videoUrl: storedVideo.videoUrl,
                    thumbnailUrl: storedVideo.thumbnailUrl,
                },
                "Thumbnail updated successfully")
        );
});

const updateVideoDetails = asyncHandler(async (req,res) =>{
    const {videoId} = req.params;
    if(!videoId){

    }
    const {title, description, tags} = req.body;
    if(!title && !description && !tags){
        throw new ApiError(400,"Details are misssing");
    }

});

const deleteVideo = asyncHandler(async (req, res) =>{

});
export {
    uploadVideo,
    changeThumbnail,
    updateVideoDetails,
    getVideo,
    deleteVideo
}