import {v2 as cloudinary} from "cloudinary";
import fs from "fs";
import ApiError from "./ApiError.js";


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});


const uploadOnCloudinary = async (localFilePath) =>{
    try{
        if(!localFilePath) return null;

        const result = await cloudinary.uploader.upload(localFilePath,{
            resource_type: "auto"
        });
        
        fs.unlinkSync(localFilePath);

        return result;
    }catch(err){
        
        if(localFilePath && fs.existsSync(localFilePath)){
            fs.unlinkSync(localFilePath);
        }
        
        return null;
    }
};

const deleteFromCloudinary = async(public_id, resourceType="image") =>{
    try{
        if(!public_id) return false;

        const result = await cloudinary.uploader.destroy(public_id, {
            resource_type: resourceType
        });

        return result;
    }catch(err){
        throw new ApiError(
            500,
            err?.message ||"Error while deleting the file"
        );
    };
};


export {uploadOnCloudinary,deleteFromCloudinary};


