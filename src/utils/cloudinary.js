import {v2 as cloudinary} from "cloudinary";
import fs from "fs";
import ApiError from "./ApiError.js";


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});


const uploadOnCloudinary = async (localFilePath) =>{
    if (!localFilePath) {
        throw new ApiError(400, "File path is required");
    }

    try{
        const result = await cloudinary.uploader.upload(localFilePath,{
            resource_type: "auto"
        });
        
        // fs.unlinkSync(localFilePath);
        await fs.promises.unlink(localFilePath);

        return result;
    }catch(err){
        // cleanup local file even on failure
        try {
            await fs.promises.unlink(localFilePath);
        } catch {}

        throw new ApiError(
            500,
            err.message || "Cloudinary upload failed"
        );
    }
};

const deleteFromCloudinary = async(public_id, resourceType="image") =>{
    if (!public_id) return false;

    try{
        return await cloudinary.uploader.destroy(public_id, {
            resource_type: resourceType
        });
        
    }catch(err){
        throw new ApiError(
            500,
            err?.message ||"Error while deleting the file"
        );
    };
};


export {uploadOnCloudinary,deleteFromCloudinary};


