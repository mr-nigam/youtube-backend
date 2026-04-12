import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { User } from "../models/user.models.js";

export const validateDeleteUser = asyncHandler(async (req,res,next)=>{
    const {email, username, password} = req.body;

    const user = await User.findById(req.user._id).select("+password");

    const normalizedEmail = email?.trim().toLowerCase().replace(/"/g, "");
    const usernameLower = username?.trim().toLowerCase();

    if(!normalizedEmail && !usernameLower){
        throw new ApiError(400,"Give at least either username or email");
    }
    
    if(
        (normalizedEmail && normalizedEmail !== user.email) &&
        (usernameLower && usernameLower !== user.username)
    ){
        throw new ApiError(400, "Wrong username or email");
    }

    if(!password){
        throw new ApiError(400, "Password is required");
    }


    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiError(401,"Incorrect password");
    }
    
    next();
});