import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"

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

export {registerUser}