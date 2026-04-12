import {Video} from "../models/video.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";


export const validateVideo = asyncHandler( async (req, _, next)=>{
    const { videoId } = req.params;

    if(!videoId){
        throw new ApiError(400,"Video id is missing");
    }
    
    if(!req.user){
        throw new ApiError(401, "User not authenticated");
    }

    const storedVideo = await Video.findById(videoId);

    if(!storedVideo){
        throw new ApiError(404,"Video not found");
    }

    if(storedVideo.owner.toString() !== req.user._id.toString()){
        throw new ApiError(403,"Unauthorized access, you are not the owner");
    }

    req.storedVideo = storedVideo;
    next();
});