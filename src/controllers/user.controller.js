import express from "express";
import {asyncHandler} from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { User} from "../models/user.models.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/ApiResponse.js";


const registerUser = asyncHandler(async (req,res,next)=>{
   
    const{fullname,username,email,password} = req.body;
    console.log(`email: ${email}`);
   
    // validation
    if(
        [fullname,username,email,password].some(
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
    const user = await User.create({
        fullname,
        avatar: avatar.url,
        email,
        coverImage: coverImage?.url || "",
        password,
        username: usernameLower
   });

   const userCreated = await User.findById(user._id);
   //.select("-password -refreshToken");

   if(!userCreated){
        throw new ApiError(500,"Server is down");
   }
   
   return res.status(201).json(
    new ApiResponse(201,userCreated,"User registered Successfully")
   );
});


export {registerUser};



/*  
----Steps to follow for User Regi   ster---

get user details from frontend
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