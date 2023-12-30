import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"


const generateAccessAndRefreshTokens = async (userId) => {
     try{
          const user = await User.findOne({userId});
          const accessToken = await user.generateAccessToken();
          const refreshToken = await user.generateRereshToken();

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

     if(!username || !email){
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

export {registerUser, loginUser, logoutUser}