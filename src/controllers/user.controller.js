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

const changeCurrentPassword=asyncHandler(async (req,res)=>{
    const {oldPassword,newpassword}=req.body

    const user=await User.findById(req.user?._id)
    const isPasswordCorrect=await user.isPasswordCorrect(oldPassword) // await is used because in user model async has introduced

    if(!isPasswordCorrect)
    {
        throw new ApiError(400,"Invalid old password");
    }
   user.password=newpassword // now it will go to user mode where we have written code for password
   await user.save ({validateBeforeSave:false})
    
   return res
   .status(200)
   .json(new ApiResponse(200,{},"Password changed succesfully"))
})

//getting current user
const getCurrentUser = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        req.user,
        "User fetched successfully"
    ))
})

const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullName, email} = req.body

    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email: email
            }
        },
        {new: true}
        
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"))
});

// file updation

const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    //TODO: delete old image - assignment

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading on avatar")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Avatar image updated successfully")
    )
})

const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing")
    }

    //TODO: delete old image - assignment


    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
  // here whatever we are storing or making variable that should be same as we had made on model
    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading on avatar")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Cover image updated successfully")
    )
})

// subscription ki story
const getUserChannelProfile=asyncHandler(async(req,res)=>{
// if you want channel profile we go for url hence params came
const{username}=req.params
if(!username?.trim())
{
    throw new ApiError(400,"username is missing");
}

// TODO--> CONSOLE_LOG(CHANNEL)
const channel = await User.aggregate([
    {
        // write your first  pipeline, matching
        $match:{
            username:username?.toLowerCase()// toLowercase is just for saftey purpose
        }
    },
   {
    // lookup ,now one document has created and it came to our user model from subscription model
    $lookup:{
        from:"subscriptions",// Subscription-->subscriptions (mongo db stores like this)
        localField:"_id",
        foreignField:"channel",
        as:"subscribers"// this is kind of variable any name you can take
    }
   },
   {
    // for counting that subscribed wala
    $lookup:{
        from:"subscriptions",// Subscription-->subscriptions (mongo db stores like this)
        localField:"_id",
        foreignField:"subscriber",
        as:"subscribedTo"
    }
   },
   {
    // now we have  to add or combine these two subscriber and subscribed field
    $addFields:{ 
        subscribersCount:{ // we are adding some additional info in our user
            $size:"$subscribers"// it will give subscriber cnt
        },
        channelsSubscribedToCount:{
            $size:"$subscribedTo"
        },
        isSubscribed: {
            $cond: {
                if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                then: true,
                else: false
            }
        }
    
    }
   },
      {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1

      }
   },

])
 

if (!channel?.length) {
    throw new ApiError(404, "channel does not exists")
}
return res
.status(200)
.json(
    new ApiResponse(200, channel[0], "User channel fetched successfully")
)
})

// Watch History
const getWatchHistory= asyncHandler(async(req,res)=>
{
    // user.req._id   // it will give whole object Id in form of string not mongoDB ki ID

    const user=await User.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(req.user._id) // it will give user model
            }
        },
        {
            $lookup:{
                from:"videos", // bit doubt in from as of now from means finnal destinaation
                localField:" watchHistory",
                foreignField:"_id",
                as:"watchHistory",// now I am at user model ke watch history section ,now we have lots document inside watch history
                                 // but still we are not getting any info about owners,hence we will use subpipeline 
                   pipeline: [
                    {
                        $lookup: { // now I am at videos model
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner", // here so many things have come like username,fullname,email,...... (because it has ObjectId users)
                                        // but we dont't want to give all these things so we will write another pipeline.
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {  // this pipeline is for to accesing first array elements of owner
                        $addFields:{
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch history fetched successfully"
        )
    )
})
 

export {registerUser
    ,loginUser
    ,logoutUser
    ,refreshAccessToken
   ,changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
    ,getUserChannelProfile,
    getWatchHistory
}














 