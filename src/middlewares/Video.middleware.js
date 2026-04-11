import {Video} from "../models/video.models.js"
import { asyncHandler } from "../utils/asyncHandler.js"

export const validateVideo = asyncHandler( async (req,res,next)=>{
    const {videoId} = req.params;
    if(!videoId){
        throw new ApiError(400,"Video id is missing");
    }
    
    const storedVideo = await Video.findById(videoId);
    if(!storedVideo){
        throw new ApiError(404,"Video is not in database");
    }

    if(!storedVideo.owner.equals(req.user._id)){
        throw new ApiError(403,"Unauthirized access, you are not the owner");
    }
    next();
});