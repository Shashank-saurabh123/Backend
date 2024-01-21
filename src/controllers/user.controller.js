import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";// it has direct connections to DB
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

// we are creating methods now but we have to make URL also on which url it should work ....
const registerUser= asyncHandler( async (req,res)=>{ // asyncHandler is higher order function
    

    // get the user details from frontend 
    // check if user already exists or not :username,email
    //check for images, check for avtar
    //upload them to cloudinary,(avtar check on cloudinary also cause it is required)
    //create user object - create entry in db
    // remove password and refresh token field from respone as we don't want to show password and token on frontend
    //check for user creation
    // finally return response

   const {fullName,email,username,password}= req.body
   console.log("email:",email);

   const existedUser=User.findOne({
    $or:[{ username },{ email }]// it is checking either username or email is matching then throw err
   });

   if(existedUser)
   {
    throw new ApiError(409,"User with email or username already exists")
   }
const avtarLocalPath  = req.files?.avatar[0]?.path;
const coverImageLocalPath =req.files?.coverImage[0]?.path;
  
if(!avtarLocalPath){
    throw new ApiError(400,"Avtar file is required");
}

const avatar     =   await uploadOnCloudinary(avtarLocalPath);
const coverImage=await uploadOnCloudinary(coverImageLocalPath);

if(!avatar){
    throw new ApiError(400,"Avtar file is required");
}
const user=await User.create({
    fullName,
    avatar:avatar.url,// we only want to store url of avatar inn DB
    coverImage:coverImage?.url || "",
    email,
    password,
    username:username.toLowerCase()
})
// mongodb adds _id with each entry
const createdUser = await User.findById(user._id).select(
    "-password -refreshToken" // this info we don't want to display on frontend hence whatever info we'll write in paranthesis they will not go on frontend
)
if(!createdUser)// checking user creation step
{
    throw new ApiError(500,"Something went wrong while registering please retry");
}

// now we wil send the response
  return res.status(201).json(
    new ApiResponse(200,createdUser,"User registered Succesfully") // made an object of Apiresponse class
  )

})


export {registerUser}