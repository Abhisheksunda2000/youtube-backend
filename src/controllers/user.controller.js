import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId) => {
     try{
          
          const user = await User.findOne(userId);
          
          const accessToken = await user.generateAccessToken();
          
          const refreshToken = await user.generateRefreshToken();
          
          user.refreshToken = refreshToken;
          
          await user.save({validateBeforeSave:false});
          return {accessToken,refreshToken};

     }catch(error){
          throw new ApiError(500, "Something went wrong while generating referesh and access token");
     }
}

const registerUser = asyncHandler( async (req,res) => {

   const {username, email, fullName, password} = req.body;

   if ([fullName, email, password, username].some((field) => field === undefined || field === null || field.trim() === "")) {
     throw new ApiError(400, "All fields are required");
  }
 

   const existedUser = await User.findOne({
        $or: [{username}, {email}]
   })

   if(existedUser){
        throw new ApiError(409,"User with email or username already exists");
   }
   

   let avatarLocalPath;
   if(req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0){
     avatarLocalPath = req.files.avatar[0].path;
   }

   
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }
    
   if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required");
   } 

   const avatar = await uploadOnCloudinary(avatarLocalPath);
   const coverImage = await uploadOnCloudinary(coverImageLocalPath);
   
   if(!avatar){
        throw new ApiError(400, "Avatar file is required");
   }


   const user = await User.create({
        fullName,
        avatar:avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
   });
   
   const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
   );

   if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering the user")
   }

   return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
   )


});

// login user

const loginUser = asyncHandler( async (req,res) => {
     // take input from frontend
     // username of email
     // find the user
     // check password
     // generate access token and refresh token 
     // send cookies

     const {email, username, password} = req.body;

     if(!username && !email){
          throw new ApiError(400, "username or email required for login");
     }

     const user = await User.findOne({
          $or : [{username}, {email}]
     })

     if(!user){
          throw new ApiError(404,"User does not exist!");
     }


     const isPasswordValid = await user.isPasswordCorrect(password);

     if(!isPasswordValid){
          throw new ApiError(401, "Invalid user Credentials");
     }

     const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id);

     const loggedInUser = await User.findById(user._id).select(
          "-password -refreshToken"
     )
    
     // by these options cookies can't be editable by frontend
     const options = {
          httpOnly:true,
          secure:true
     }

     return res
     .status(201)
     .cookie("accessToken",accessToken,options)
     .cookie("refreshToken",refreshToken,options)
     .json(
          new ApiResponse(
               200,
               {
                   user: loggedInUser,accessToken,refreshToken
               }, 
               "user logged in successfully"
               )
     )
});


const logoutUser = asyncHandler( async (req,res) =>{

     await User.findByIdAndUpdate
     (
          req.user._id,
          {
               $set:{
                    refreshToken: undefined
               }
          },
          {
               new:true // u get new updated value in response 
          }
     )

     const options = {
          httpOnly:true,
          secure:true
     }

     return res
     .status(200)
     .clearCookie("accessToken", options)
     .clearCookie("refreshToken", options)
     .json(
          new ApiResponse(200, {}, "User Logged Out successfully")
     )
       
});

const refreshAccessToken = asyncHandler(async (req,res) =>{
       const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

       if(!incomingRefreshToken){
          throw new ApiError(401, "Unauthorised request");
       }

       try {
          const decodedToken =  jwt.verify(incomingRefreshToken, process.REFRESH_TOKEN_SECRET);
   
          const user = await User.findById(decodedToken?._id);
   
          if(!user){
             throw new ApiError(401, "Invalid Refresh Token");
          }
   
          if(incomingRefreshToken !== user?.refreshToken){
             throw new ApiError(401, "Refresh token is expired or used");
          }
   
          const options = {
             httpOnly:true,
             secure:true
        }
   
          const {accessToken,newRefreshToken} = await generateAccessAndRefreshTokens(user._id);
   
          return res
          .status(200)
          .cookie("accessToken",accessToken, options)
          .cookie("refreshToken",newRefreshToken,options)
          .json(
             new ApiResponse(200, {accessToken,newRefreshToken}, "Access token refreshed successfully")
          )
       } catch (error) {
          throw new ApiError(401,error?.message || "Invalid refresh token");
       }
});

const changeCurrentPassword = asyncHandler( async (req,res) =>{

     const {oldPassword, newPassword} = req.body;

     const user = await User.findById(req.user?._id);

     // if(!user){
     //      throw new ApiError(401, "Unauthorized Access");
     // }

     const isPasswordValid = await user.isPasswordCorrect(oldPassword);

     if(!isPasswordValid){
          throw new ApiError(400, "Invalid old password");
     }

     user.password = newPassword;
     await user.save({validateBeforeSave:false});

     return res
     .status(200)
     .json(
          new ApiResponse(200,{}, "Password successfully updated")
     )

});

const getCurrentUser = asyncHandler( async(req,res) => {
     return res
     .status(200)
     .json(
          new ApiError(200, req.user, "current user fetched successfully")
     )
});

const updateAccountDetails = asyncHandler( async (req,res) => {
     const {fullName, email} = req.body;

     if(!fullName || !email){
          throw new ApiError(400, "All fields are required");
     }

     const user = await User.findByIdAndUpdate(
          req.user?._id,
               {    
                    $set:{
                         fullName,
                         email,
                    }
               },
               {
                    new:true
               }
     ).select("-password -refreshToken");

     return res
     .status(200)
     .json(
          new ApiResponse(200, user, "Account details updated successfully")
     )
});

const updateUserAvatar = asyncHandler(async(req,res) =>{
     
     let avatarLocalPath;
     if(req.file && Array.isArray(req.file.avatar) && req.file.avatar.length > 0){
          avatarLocalPath = req.file.avatar[0].path;
     }

     if(!avatarLocalPath){
          throw new ApiError(400, "Avatar File is required");
     }

     const avatar = await uploadOnCloudinary(avatarLocalPath);

     if(!avatar){
          throw new ApiError(400, "Error while updating the avatar");
     }
     
     const user = await User.findByIdAndUpdate(
          req.user?._id,
          {
               $set:{
                    avatar:avatar.url,
               }
          },
          {
               new:true
          }  
     ).select("-password -refreshToken");
     
     return res
     .status(200)
     .json(
          new ApiResponse(200,user,"Avatar successfully updated")
     )
});

const updateUserCoverImage = asyncHandler(async(req,res) =>{
     
     let coverImageLocalPath;
     if(req.file && Array.isArray(req.file.coverImage) && req.file.coverImage.length > 0){
          coverImageLocalPath = req.file.coverImage[0].path;
     }

     if(!coverImageLocalPath){
          throw new ApiError(400, "Cover Image File is required");
     }

     const coverImage = await uploadOnCloudinary(coverImageLocalPath);

     if(!coverImage){
          throw new ApiError(400, "Error while updating the cover Image");
     }
     
     const user = await User.findByIdAndUpdate(
          req.user?._id,
          {
               $set:{
                    coverImage:coverImage.url,
               }
          },
          {
               new:true
          }  
     ).select("-password -refreshToken");
     
     return res
     .status(200)
     .json(
          new ApiResponse(200,user,"Cover Image successfully updated")
     )
});

const getUserChannelProfile = asyncHandler(async(req,res) =>{
     const {username} = req.params;

     if(!username?.trim()){
          throw new ApiError(400, "Username is missing");
     }

     const channel = await User.aggregate([
          {
               $match:{
                    username : username?.toLowerCase()
               }
          },
          {
               $lookup:{
                    from:"subscriptions",
                    localField: "_id",
                    foreignField:"channel",
                    as:"subscribers"
               }
          },
          {
               $lookup:{
                    from:"subscriptions",
                    localField: "_id",
                    foreignField:"subscriber",
                    as:"subscribedTo"
               }
          },
          {
               $addFields:{
                    subscribersCount:{
                         $size:"$subscribers"
                    },
                    channelsSubscribedToCount:{
                         $size:"$subscribedTo"
                    },
                    isSubscribed:{
                         $cond:{
                              if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                              then:true,
                              else:false
                         }
                    }
               }
          },
          {
               $project:{
                    fullName:1,
                    username:1,
                    email:1,
                    subscribersCount:1,
                    channelsSubscribedToCount:1,
                    isSubscribed:1,
                    avatar:1,
                    coverImage:1
               }
          }
    ]);

    if(!channel?.length){
          throw new ApiError(404, "channel does not exist");
    }

    return res
    .status(200)
    .json(
          new ApiResponse(200, channel[0], "user channel fetched successfully")
    );
});

const getWatchHistory = asyncHandler(async(req,res) =>{

     const user = User.aggregate([
          {
               $match:{
                    _id:new mongoose.Types.objectID(req.user._id)
               }
          },
          {
               $lookup:{
                    from:"videos",
                    localField:"watchHistory",
                    foreignField:"_id",
                    as:"watchHistory",
                    pipeline:[
                         {
                              $lookup:{
                                   from:"users",
                                   localField:"owner",
                                   foreignField:"_id",
                                   as:"owner",
                                   pipeline:[
                                        {
                                             $project:{
                                                  fullName:1,
                                                  username:1,
                                                  avatar:1
                                             }
                                        }
                                   ]
                              }
                         },
                         {
                              $addFields:{
                                   owner:{
                                        $first:"$owner"
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
               "Watch History fetched successfully"
          )
     );

});

export 
{
     registerUser, 
     loginUser, 
     logoutUser, 
     refreshAccessToken,
     changeCurrentPassword,
     getCurrentUser,
     updateAccountDetails,
     updateUserAvatar,
     updateUserCoverImage,
     getUserChannelProfile,
     getWatchHistory
}