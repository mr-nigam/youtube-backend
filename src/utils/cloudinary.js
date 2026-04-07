import {v2 as cloudinary} from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) =>{
    try{
        if(!localFilePath) return null;

        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type: "auto"
        });
        
        fs.unlinkSync(localFilePath);

        // console.log(`file is uploaded on cloudinary ${respons    e.url}`);
        return response;
    }catch(err){
        // remove temp file if upload fails
        //fs.unlinkSync(localFilePath);
        // fs.unlink(localFilePath, (err) => {
        //     if (err) console.error("unlink failed", err);
        // });
        
        if(localFilePath && fs.existsSync(localFilePath)){
            fs.unlinkSync(localFilePath);
        }
        
        return null;
    }
};

export {uploadOnCloudinary};


