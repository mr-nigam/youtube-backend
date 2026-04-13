import ApiError from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose, {isValidObjectId} from "mongoose"
import { Like } from "../models/like.models.js";


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
                totalLikes:[
                    { $count: "count" }
                ]
            }
        }
    ]);

    const data = result[0] || { totalLikes: [], likes: [] };

    return {
        totalLikes: data.totalLikes[0]?.count || 0,
        likesData: data.likes
    };

};

const toggleLike  = asyncHandler(async (req,res) =>{
   const {itemId, model} = req.params;
    
    if(!itemId || !isValidObjectId(itemId) || !model){
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
    
    const {totalLikes, likesData} = await getLikesDetails(itemId, model);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { totalLikes, likesData },
                message
            )
        );

});

const likesDetails = asyncHandler(async (req,res) =>{
    const {itemId, model} = req.body;
    
    if(!itemId || !isValidObjectId(itemId) || !model){
        throw new ApiError(400, `Invalid itemId or model`);
    }
    
    const data = await getLikesDetails(itemId, model);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                data,
                "Likes data fetched successfully"
            )
        );
});

const likesCount = asyncHandler(async (req,res)=>{
    const {itemId, model} = req.params;

    if (!itemId || !isValidObjectId(itemId) || !model) {
        throw new ApiError(400, "Invalid itemId or model");
    }

    const totalLikes = await Like.countDocuments({
        item: itemId,
        onModel: model
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            { totalLikes },
            "Like count fetched successfully"
        )
    );
});

export{
    toggleLike,
    likesDetails,
    likesCount
}