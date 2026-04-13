import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";


export const verifyJWT = asyncHandler(async (req, _, next) => {
    // 1. Extract token safely
    const authHeader = req.header("Authorization");

    const token =
        req?.cookies?.accessToken ||
        (authHeader?.startsWith("Bearer ")
            ? authHeader.split(" ")[1]
            : null);

    if (!token) {
        throw new ApiError(401, "Access token is missing");
    }

    let decodedToken;

    // 3. Verify token
    try {
        decodedToken = jwt.verify(
            token,
            process.env.ACCESS_TOKEN_SECRET
        );
    } catch (err) {
        throw new ApiError(401, "Invalid or expired access token");
    }


    const user = await User.findById(decodedToken?._id)
        .select("-password -refreshToken")
        .lean();

    if (!user) {
        throw new ApiError(401, "User not found or token invalid");
    }

    req.user = user;
    next();
});