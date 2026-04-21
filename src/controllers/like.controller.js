import ApiError from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose, {isValidObjectId} from "mongoose"
import { Like } from "../models/like.models.js";


const allowedModels = ["Video", "Comment", "Tweet"];

const getLikesDetails = async(itemId,model)=>{
    const result = await Like.aggregate([
        {
            $match: {
                item: new mongoose.Types.ObjectId(itemId),
                onModel: model
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "likedBy",
                foreignField: "_id",
                as: "user"
            }
        },
        {
            $unwind: "$user"
        },
        {
            $facet:{
                likes: [
                    {
                        $project: {
                            _id: 1,
                            likedAt: 1,
                            user: {
                                _id: "$user._id",
                                username: "$user.username",
                                avatar: "$user.avatar"
                            }
                        }
                    }
                ],
            }
        }
    ]);

    const data = result[0] || { likes: [] };

    return {
        likesData: data.likes
    };

};

const toggleLike  = asyncHandler(async (req,res) =>{
    const {itemId} = req.params;
    const model = req.body.model?.trim();

    if(!itemId || !isValidObjectId(itemId) || !allowedModels.includes(model)){
        throw new ApiError(400, `Invalid itemId or model`);
    }

    const deletedLike  = await Like.findOneAndDelete({
        likedBy: req.user._id,
        item: itemId,
        onModel: model
    });

    let message;
    // if Exists
    if(deletedLike){
        message = `${model} unliked successfully`;
    }else{
        await Like.create({
            likedBy: req.user._id,
            item: itemId,
            onModel: model
        });
        message = `${model} liked successfully`;
    }
    
    // const {totalLikes, likesData} = await getLikesDetails(itemId, model);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {success: true},
                message
            )
        );

});

const likesDetails = asyncHandler(async (req,res) =>{
    const {itemId} = req.params;
    const model = req.body.model?.trim();

    if(!itemId || !isValidObjectId(itemId) || !allowedModels.includes(model)){
        throw new ApiError(400, `Invalid itemId or model`);
    }
    
    let {page=1} = req.query;
    page = parseInt(page,10) || 1;
    
    const limit = 25;
    const skip = (page-1)*limit;

    const filters = {
        item: itemId,
        onModel: model
    };

    const likesData = await Like.find(filters)
        .select("likedBy createdAt")
        .sort({createdAt: -1})
        .skip(skip)
        .limit(limit)
        .populate("likedBy","username avatar")
        .lean();

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { likesData, page, limit },
                "Likes data fetched successfully"
            )
        );
});

export{
    toggleLike,
    likesDetails,
}