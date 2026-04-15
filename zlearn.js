import {asyncHandler} from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import {uploadOnCloudinary, deleteFromCloudinary} from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import pLimit from "p-limit";

// import all models
import { User } from "../models/user.models.js";
import { Video } from "../models/video.models.js";
import { Like } from "../models/like.models.js";
import { Comment } from "../models/comment.models.js";
import { Tweet } from "../models/tweet.models.js";
import { Subscription } from "../models/subscription.models.js";
import { Playlist } from "../models/playlist.models.js";
import { WatchHistory } from "./src/models/watchHistory.models.js";



const getChannelProfile = asyncHandler(async(req,res)=>{
    const {channelId} = req.params;
    
    if(!channelId || !isValidObjectId(channelId)){
        throw new ApiError(400, `Invalid Channel id`);
    }

    // converting usedId string to ObjectId type
    const userId = req.user?._id
        ? new mongoose.Types.ObjectId(req.user._id)
        : null;
    
    const channel = await User.aggregate([
        {
            $match: { _id: channelId }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers",
                pipeline: [
                    {
                        $addFields: {
                            subscribersCount: {
                                $size: "$subscribers"
                            }
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribed",
                pipeline: [
                    {
                        $addFields: {
                            subscribedcount: {
                                $size: "$subscribed"
                            }
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                isSubscribed: {
                    $cond: {
                        if: {$in: [userId,"$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                },

            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                avatar: 1,
                coverImage: 1,
                subscribersCount: 1,
                subscribedcount: 1,
                isSubscribed: 1,
                totalViews: 1,
                createdAt: 1

            }
        }
    ]);

});

const getWatchHistory = asyncHandler(async (req,res)=>{
    const userId = req.user?._id 
            ? new mongoose.Types.ObjectId(req.user._id)
            : null;
    
        if (!userId) {
            throw new ApiError(400, "User not logged in");
        }

    const watchhistory = await User.aggregate([
        {
            $match: { _id : userId }
        },
        {
            $lookup: {
                from: "watchhistories",
                localField: "_id",
                foreignField: "watchedBy",
                as: "history",
                pipeline: [
                    {
                        $lookup: {
                            from: "videos",
                            localField: "video",
                            foreignField: "_id",
                            as: "video",
                            pipeline: [
                                {
                                    $lookup: {
                                        from: "users",
                                        localField: "owner",
                                        foreignField: "_id",
                                        as: "owner",
                                        pipeline:[
                                            {
                                                $project: {
                                                    _id: 0,
                                                    fullName: 1,
                                                    username: 1,
                                                    avatar: 1
                                                }
                                            }
                                        ]
                                    }
                                },
                                {
                                    $addFields: {
                                        owner: {$first:"$owner"}
                                    }
                                },
                                {
                                    $project: {
                                        owner: 1,
                                        title: 1,
                                        thumbnailUrl: 1,
                                        duration: 1,
                                        views: 1,
                                        videoUrl: 1,
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            video: {$first: "$video"}
                        }
                    }
                ]
            }
        },
        // ✅ Flatten history → videos[]
        {
        $addFields: {
            videos: {
                $map: {
                    input: "$history",
                    as: "h",
                    in: "$$h.video"
                    }
                }
            }
        },
            // ✅ Remove unnecessary history field
        {
            $project: {
                history: 0
            }
        }
    ]);


});



/*
await WatchHistory.findOneAndUpdate(
  { watchedBy: userId, video: videoId },
  { $set: { watchedAt: new Date() } },
  { upsert: true, new: true }
);
*/