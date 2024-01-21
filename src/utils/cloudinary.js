import {v2 as cloudinary} from 'cloudinary';
import fs from "fs"      

// this configuration only provide you permission to upload which files need to be submitted

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

// file uploadation will consume time, hence we will go for async await

const uploadOnCloudinary = async (localFilePath)=>{
    try {
        
        if(!localFilePath) return null;
        // upload the file on cloudinary
      const response= await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"// it will detect by own which file is coming
        })// we can give more info abt the file which we are uploading ,eg:if it is photo is it in png or in jpg ...etc
       
        // now file has been uploaded succesfully
        console.log("file is uploaded on cloudinary",response.url);
        // task--> print console.log(response) and see what info you get or go to cloudinary website

        return response;// this will go to user
    } catch (error) {
        fs.unlinkSync(localFilePath)// it removes the locally saved temporary files as the upload operation
                                    // got failed
         return null;


    }
}


export {uploadOnCloudinary}
  