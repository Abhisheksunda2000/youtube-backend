import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"

const registerUser = asyncHandler( async (req,res) => {
   // take data from frontend
   // check validation
   // check username and email already exists
   // check for images and avatar
   // upload images and avatar to cloudinary
   // create user object, create entry in db
   // check entry is created 
   // remove password and refresh token field from response
   // return response

   const {username, email, fullName, password} = req.body;

   if([fullName,email,password,username].some((field) => field?.trim() === "")){
        throw new ApiError(400, "All fields are required");
   }

   const existedUser = await User.findOne({
        $or: [{username}, {email}]
   })

   if(existedUser){
        throw new ApiError(409,"User with email or username already exists");
   }

   const avatarLocalPath = req.files?.avatar[0]?.path;
   const coverImageLocalPath = req.files?.coverImage[0]?.path;

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