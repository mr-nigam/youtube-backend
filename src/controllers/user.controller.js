import {asyncHandler} from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import {User} from "../models/user.models.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";


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

// cookies options
const getCookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict"
});

const registerUser = asyncHandler(async (req,res) => {
   
    const{fullName,username,email,password} = req.body;
    //console.log(`email: ${email}`);
   
    // validation
    if(
        [fullName,username,email,password].some(
            (field) => field?.trim()===""
        )
    ){
        throw new ApiError(400,"All fields are required!");
    }

    // check for existing user
    const usernameLower = username.toLowerCase();

    const userExisted = await User.findOne({
        $or: [{ username: usernameLower},{email}]
    });

    if(userExisted){
        throw new ApiError(409,"User Already Exist");
    }

//    check for files
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is required");
    }

//    upload files on Cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    let coverImage;
    if (coverImageLocalPath) {
        coverImage = await uploadOnCloudinary(coverImageLocalPath);
    }
   
    if(!avatar){
        throw new ApiError(400,"Avatar is required");
    }
    // create user on db
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        email: email.replace(/"/g, "").trim().toLowerCase(),
        coverImage: coverImage?.url || "",
        password,
        username: usernameLower
    });

   
    const createdUser = await User.findById(user._id).select(
        "-password -__v -watchHistory -subscriptions -subscribers -refreshToken"
    );

    if(!createdUser){
        throw new ApiError(500,"Server is down");
    }
   
    return res.status(201).json(
        new ApiResponse(201,createdUser,"User registered Successfully")
    );
});

const loginUser = asyncHandler(async (req, res) => {

    const {username,email,password} = req.body;
    
    if((!username && !email) || !password){
        throw new ApiError(400,"username/email and password required");
    }

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
                "User loggin in successfully"
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
        {
            returnDocument: "after"
        }
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

    const user = await User.findById(req.user._id);

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
        { new: true}
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

const updateUserAvatar = asyncHandler(async (req,res) =>{
    const avatarLocalPath = req?.file?.path;

    // delete old avatar from cloudinary here
    // await deleteFromCloudinary(user.avatar);

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is missing");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if(!avatar?.url){
        throw new ApiError(400,"Error while uploading avatar");
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new: true}
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
                "Avatar updated successfully"
            )
        );
});

const updateUserCoverImage = asyncHandler(async (req,res) => {
    const coverImageLocalPath = req?.file?.path;

    // delete old coverImage from cloudinary here
    // await deleteFromCloudinary(user.coverImage);

    if(!coverImageLocalPath){
        throw new ApiError(400,"Cover image is missing");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!coverImage.url){
        throw new ApiError(400,"Error while uploading cover image");
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new: true}
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
                "Cover image updated successfully"
            )
        );

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
    updateUserCoverImage
};



/*  
----Steps to follow for User Register---
get user details from frontend/body
validation for data - not empty
check if user already exist: username and email
check for images, check for avatar
upload them to cloudinary, avatar
check for avatar from cloudinary
create user object - creat entry in db
remove password and refresh token fields from respone
check for response for user creatin from db
return res for done else return error
*/

/*
----Steps to follow for User Login---
get user details from frontend/body

*/