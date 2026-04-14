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


const generateAccessAndRefreshToken = async (userId) => {
    try{
        const user = await User.findById(userId);
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();
        
        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});

        return {accessToken,refreshToken};

    }catch(error){
        throw new ApiError(500,"Something went wrong while generating   refresh and access tokens");
    }
}

const getCookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict"
});

const registerUser = asyncHandler(async (req,res) => {
   
    const{fullName, username, email, password} = req.body;
    
    //Validate fields
    if(
        [fullName, username, email, password].some(
            (field) => !field || field.trim() === ""
        )
    ){
        throw new ApiError(400,"All fields are required!");
    }

    // Normalize data  
    const normalizedEmail = email?.trim().toLowerCase().replace(/"/g, "");
    const usernameLower = username?.trim().toLowerCase();
    
    // Check existing user
    const userExisted = await User.findOne({
        $or: [{ username: usernameLower},{email: normalizedEmail}]
    });

    if(userExisted){
        throw new ApiError(409,"User Already Exist");
    }

    let avatar, coverImage;
    try{
        const avatarLocalPath = req.files?.avatar?.[0]?.path;
        const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
        
        if(!avatarLocalPath){
            throw new ApiError(400,"Avatar is required");
        }

        avatar = await uploadOnCloudinary(avatarLocalPath);

        if(!avatar){
            throw new ApiError(500,"Failed to upload avatar");
        }

        if (coverImageLocalPath) {
            coverImage = await uploadOnCloudinary(coverImageLocalPath);
        }

         // Create User in db
        const user = await User.create({
            fullName,
            avatar: avatar.secure_url,
            avatarPublicId: avatar.public_id,
            email: normalizedEmail,
            coverImage: coverImage?.secure_url || "",
            coverImagePublicId: coverImage?.public_id || "",
            password,
            username: usernameLower
        });

        const createdUser = await User.findById(user._id)
        .select("-password -__v -watchHistory -subscriptions -subscribers -refreshToken");
        
        if(!createdUser){
            throw new ApiError(500, "User creation failed");
        }

        return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                createdUser,
                "User registered Successfully"
            )
        );

    }catch(error){
        // 🧹 Cleanup Cloudinary if anything fails
        try {
            if (avatar?.public_id) {
                await deleteFromCloudinary(avatar.public_id, "image");
            }
            if(coverImage?.public_id) {
                await deleteFromCloudinary(coverImage.public_id, "image");
            }
        }catch(cleanupError) {
            console.error("Cloudinary cleanup failed:", cleanupError.message);
        }

        throw new ApiError(
                error.statusCode || 500,
                error.message || "User creation failed"
            );
    };
});

const loginUser = asyncHandler(async (req, res) => {

    const {username,email,password} = req.body;
    
    if((!username && !email) || !password){
        throw new ApiError(400,"username/email and password required");
    }
    
    // const normalizedEmail = email?.trim().toLowerCase().replace(/"/g, "");
    // const usernameLower = username.trim().toLowerCase();
    
    const user = await User.findOne({
        $or: [
            username && { username: username.toLowerCase() },
            email && { email: email.trim().toLowerCase() }
        ].filter(Boolean)
    }).select("+password");

    if(!user){
        throw new ApiError(400,"User does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiError(401,"incorrect password");
    }

    const {accessToken,refreshToken} = await generateAccessAndRefreshToken(user._id);
    
    // optional steps
    const loggedinUser = await User.findById(user._id)
        .select("-refreshToken -password");
        
    return res
        .status(200)
        .cookie("accessToken",accessToken,getCookieOptions())
        .cookie("refreshToken",refreshToken,getCookieOptions())
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedinUser,
                    accessToken,
                    refreshToken
                },
                "User logged in successfully"
            )
        );

});

const logoutUser = asyncHandler(async (req,res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        { returnDocument: "after"}
    )
    
    return res
        .status(200)
        .clearCookie("accessToken",getCookieOptions())
        .clearCookie("refreshToken",getCookieOptions())
        .json(
            new ApiResponse(200,{},"User logged Out")
        );

});

const refreshAccessToken = asyncHandler(async (req,res) => {
    
    const incomingRefreshToken = 
        req?.cookies?.refreshToken || req?.body?.refreshToken;

    if(!incomingRefreshToken){
        throw new ApiError(401,"Unauthorized request");
    }
    
    try{
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        const user = await User.findById(decodedToken._id)
            .select("+refreshToken");

        if(!user){
            throw new ApiError(401,"Invalid refresh token");
        }
        
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"Refresh token is expired or used");
        }
        
        const {accessToken,refreshToken} = 
            await generateAccessAndRefreshToken(user._id);

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        // console.log("refreshAccessToken is working fine");
        return res
            .status(200)
            .cookie("accessToken",accessToken,getCookieOptions())
            .cookie("refreshToken",refreshToken,getCookieOptions())
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken,
                        refreshToken
                    },
                    "Access token refresh successfully"
                )
            );
            
    }catch(err){
        throw new ApiError(401,err?.message || "invalid refresh token");
    }

});

const changeCurrentPassword = asyncHandler(async (req,res) => {
    const {oldPassword, newPassword} = req.body;

    if(!oldPassword || !newPassword) {
        throw new ApiError(400, "Old and new password are required");
    }

    if(oldPassword === newPassword) {
        throw new ApiError(400, "New password must be different");
    }

    const user = await User.findById(req.user._id).select("+password");

    if(!user){
        throw new ApiError(404,"User not found");
    }

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if(!isPasswordCorrect){
        throw new ApiError(400,"Invalid Password");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false});

    return res
        .status(200)
        .json(
            new ApiResponse(200,{},"Password changed Successfully")
        );
});

const getCurrentUser = asyncHandler(async (req,res) => {
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {user: req.user},
                "Current user fethed successfully"
            )
        )
});

const updateAccountDetails = asyncHandler(async (req,res) => {
    const{fullName, email} = req.body;

    if(!fullName && !email){
        throw new ApiError(400,"No data given");
    }
    
    const updateFields = {};

    if (fullName) updateFields.fullName = fullName;
    if (email) updateFields.email = email;

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: updateFields },
        { returnDocument: "after"}
    ).select("-password -refreshToken");

    if (!user){
        throw new ApiError(404, "User not found");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user,
                "Account details updated successfully"
            )
        );
});

const updateUserAvatar = asyncHandler(async (req,res) => {
    const avatarLocalPath = req?.file?.path;

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is missing");
    }

    const user = req.user;

    const oldavatarPublicId = user.avatarPublicId;

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if(!avatar){
        throw new ApiError(400,"Error while uploading avatar");
    }

    user.avatar = avatar.secure_url;
    user.avatarPublicId = avatar.public_id;
    await user.save({validateBeforeSave: false}) 

    try{
        if(oldavatarPublicId){
            await deleteFromCloudinary(oldavatarPublicId,"image");
        }
    }catch(err){
        console.error("Cloudinary deletion failed:", err.message);
    }
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                avatar.secure_url,
                "Avatar updated successfully"
            )
        );
});

const updateUserCoverImage = asyncHandler(async (req,res) => {
    const coverImageLocalPath = req?.file?.path;

    if(!coverImageLocalPath){
        throw new ApiError(400,"Cover image is missing");
    }
    
    const user = req.user;

    const oldcoverImagePublicId = user.coverImagePublicId;

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!coverImage.url){
        throw new ApiError(400,"Error while uploading cover image");
    }

    user.coverImage = coverImage.secure_url;
    user.coverImagePublicId = coverImage.public_id;
    await user.save({validateBeforeSave: false});

    try{
        if(oldcoverImagePublicId){
            await deleteFromCloudinary(oldcoverImagePublicId,"image");
        }
    }catch(err){
        console.error("Cloudinary deletion failed:", err.message);
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                coverImage.secure_url,
                "Cover image updated successfully"
            )
        );

});

const getChannelProfile = asyncHandler(async (req,res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    const {channelId} = req.params;
    
    if(!channelId || !isValidObjectId(channelId)){
        throw new ApiError(400, `Invalid Channel id`);
    }

    // converting usedId string to ObjectId type
    const userId = req.user?._id
        ? new mongoose.Types.ObjectId(req.user._id)
        : null;

    
    let channel = await User.aggregate([
        {
            $match: {_id: channelId}
        },
        {
            $lookup: {
                from:  "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"

            }
        },
        {
           $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
           } 
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelSubscribersToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $and: [
                        {$ne: [userId, null]},
                        {$in: [userId,"$subscribers.subscriber"]}
                    ]    
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                avatar: 1,
                coverImage: 1,
                subscribersCount: 1,
                channelSubscribersToCount: 1,
                isSubscribed: 1,
                totalViews: 1
            }
        }
    ]);

    if(!channel?.length){
        throw new ApiError(404,"Channel does not exist");
    }
    console.log(channel);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                channel[0],
                "Channel details are fethced successfully"
            )
        );
});

const getWatchHistory = asyncHandler (async (req,res) => {
    const loggedInUserId = req.user?._id 
        ? new mongoose.Types.ObjectId(req.user._id)
        : null;

    if (!loggedInUserId) {
        throw new ApiError(400, "User not logged in");
    }

    const details = await User.aggregate([
        {
            $match: {
                _id: loggedInUserId
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField : "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
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
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }   
        },
    ]);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                 details?.[0]?.watchHistory ?? [],
                "Watch history fetched successfully"
            )
        );
});

const deleteUser = asyncHandler(async (req,res)=>{
    const user = req.user;
   
    // Start transaction
    const session = await mongoose.startSession();
    
    let avatarPublicId = user?.avatarPublicId; 
    let coverImagePublicId = user?.coverImagePublicId; 
    let videos = [];
    try{
    
        await session.withTransaction(async()=>{
            // fetch videos
            videos = await Video.find({owner: user._id}).session(session);

            await Promise.all([
                Video.deleteMany({owner: user._id}).session(session),
                Like.deleteMany({likedBy: user._id}).session(session),
                Comment.deleteMany({owner: user._id}).session(session),
                Tweet.deleteMany({postedBy: user._id}).session(session),
                Playlist.deleteMany({postedBy: user._id}).session(session),
                Subscription.deleteMany({
                    $or: [ {subscriber: user._id}, {channel: user._id}]
                }).session(session),    
            ]);

            // delete User
            const deletedUser = await User.findByIdAndDelete(user._id).session(session);
            if (!deletedUser) {
                throw new ApiError(500, "Failed to delete user");
            }
        });
        
        //----- Delete data from clodunary
        const limit = pLimit(5);

        await Promise.all(
            videos.flatMap(video => [
                limit(() =>
                    deleteFromCloudinary(video.cloudinaryPublicFileId, "video")
                        .catch(err => console.error("Video delete failed:", err.message))
                ),
                limit(() =>
                    deleteFromCloudinary(video.cloudinaryPublicThumbnailId, "image")
                        .catch(err => console.error("Thumbnail delete failed:", err.message))
                )
            ])
        );
        
        // delete avatar and coverimage
        try{
            if(avatarPublicId){
                await deleteFromCloudinary(avatarPublicId,"image");
            }
            if(coverImagePublicId){
                await deleteFromCloudinary(coverImagePublicId,"image");   
            }
            console.log("Cloudinary deletion done");
        }catch(err){
            console.error("Cloudinary deletion failed",err.message);
        }

        console.log("User deleted successfully");

        return res.status(200).json({
            success: true,
            message: "User and all associated data deleted successfully"
        });

    }catch(error){
        console.error("Deletion failed:", error.message);

        throw new ApiError(
            error.statusCode || 500,
            error.message || "User deletion failed"
        );
    }finally{
        // ✅ close session
        session.endSession();
    }
});


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getChannelProfile,
    getWatchHistory,
    deleteUser
};
