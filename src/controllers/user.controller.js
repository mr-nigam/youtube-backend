import {asyncHandler} from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import {User} from "../models/user.models.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/ApiResponse.js";

const generateAccessAndRefreshToken = async function (userId) {
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

const loginUser = asyncHandler(async (req, res)=>{
    const {username,email,password} = req.body;
    
    if((!username && !email) || !password){
        throw new ApiError(400,"username/email and password required");
    }

    const user = await User.findOne({
        $or: [
            username && { username: username.toLowerCase() },
            email && { email: email.trim().toLowerCase() }
        ].filter(Boolean)
    });

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
    
    // cookies
    const options = {
        httpOnly: true,
        // secure: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict"
    }
    
    return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",refreshToken,options)
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

const logoutUser = asyncHandler(async function(req,res) {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    )
    
    const options = {
        httpOnly: true,
        // secure: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict"
    };
    
    return res
        .status(200)
        .clearCookie("accessToken",options)
        .clearCookie("refreshToken",options)
        .json(
            new ApiResponse(200,{},"User logged Out")
        );

});


export {
    registerUser,
    loginUser,
    logoutUser

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