import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";// it has direct connections to DB
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";


// const generateAccessAndRefreshTokens=async (userId)=>{
//     try {
//         const user=await User.findById(userId)
//        const  accessToken= user.generateAccessToken()
//         const refreshToken=user.generateRefreshToken() // refreshToken has to be saved in db
     
//         // our user will have all info as of now in the form of object 
//         // how we are addinng refreshtoken through our user in to the db, ket's see
//         user.refreshToken=refreshToken
//         await user.save({ validateBeforeSave: false })// because for any save operation our DB will ask for Password
//                                                        // but here we don't want password check that'why we are making it to false

//         return {accessToken, refreshToken}

//     } catch (error) {
//         throw new ApiError(500,"Something went wrong while genrating refresh and access token")
//     }
// }

const generateAccessAndRefereshTokens = async(userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken =  user.generateRefreshToken()
        const refreshToken =  user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })
     
        return {accessToken, refreshToken}

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}



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

   const existedUser= await User.findOne({
    $or:[{ username },{ email }]// it is checking either username or email is matching then throw err
   });

   if(existedUser)
   {
    throw new ApiError(409,"User with email or username already exists")
   }
  // console.log(req.files);// for knowledge purpose
   // it will give all the info abt files in the format of object inside array 

const avtarLocalPath  = req.files?.avatar[0]?.path;
const coverImageLocalPath =req.files?.coverImage[0]?.path;
  

// let coverImageLocalPath;
//     if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
//         coverImageLocalPath = req.files.coverImage[0].path
//     }
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
    "-password -refreshToken -email" // this info we don't want to display on frontend hence whatever info we'll write in paranthesis they will not go on frontend
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

const loginUser =asyncHandler( async (req,res)=>{
    // get data from req->body
    //username or email
    // find the user
    // if user exist then password check
    // password check
    //acces and refresh token
    // send these tokens in form of cookies
    // that's it send then succesful message

    const  {email,username,password} =req.body

    if(!username && !email)
    {
        throw new ApiError(400,"username or password is required")
    }
    const user= await User.findOne({
        $or:[{username},{email}] // if we want that either username or email we can get logged in
                                 // this user object will  have lots of unwanted info also ,it will have acces and refresh token but they will be empty
    })                           // further when we are generating refresh and acces tokens we can update them by user.("that operation")
    if(!user)
    {
        throw new ApiError(404,"user does not exist")
    }
    // password check
   const isPasswordValid= await user.isPasswordCorrect(password)
   if(!isPasswordValid)
   {
       throw new ApiError(401,"Invalid user credentials")
   }
// now make access and refresh token we will make a method of them because it will use so often
  const {accessToken,refreshToken}= await generateAccessAndRefereshTokens(user._id) // same as a req.body
  
 
  // here either we can send qury to db or update the user tokens that are empty  as of now

 const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

 //cookies creation
  const options={
    httpOnly: true,
    secure: true
    // now it can be modifyiable from server side we vcan view on frontend but can't  edit on frontend side
  }

  return res
  .status(200)
  .cookie("accessToken", accessToken, options)
  .cookie("refreshToken", refreshToken, options)
  .json(
      new ApiResponse(
          200, 
          {
              user: loggedInUser, accessToken, refreshToken
          },
          "User logged In Successfully"
      )
  )
})

// loogut model


const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
})

// refreshing acces token 

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
    // now incomingRefereshtoken is new referesh token which has sent by user in decoded format
      // and we have stored already referesh tokens value in user in incoded format, now it will check that 
      // whatever user has sent new referesh token is matching or not with those incrypted tokens those are saved in DB or user
  
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
            
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefereshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200, 
                {accessToken, refreshToken: newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})



export {registerUser,loginUser,logoutUser,refreshAccessToken}














 