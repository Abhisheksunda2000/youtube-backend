import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const uploadVideo = asyncHandler(async(req,res) => {

    let videoFileLocalPath;
    if(req.files && Array.isArray(req.files.videoFile) && req.files.videoFile.length > 0){
        videoFileLocalPath = req.files.videoFile[0].path;
    }

    let thumbnailLocalPath;
    if(req.files && Array.isArray(req.files.thumbnail) && req.files.thumbnail.length > 0){
        thumbnailLocalPath = req.files.thumbnail[0].path;
    }

    if(!videoFileLocalPath){
        throw new ApiError(400, "Video File Should be present");
    }

    if(!thumbnailLocalPath){
        throw new ApiError(400, "Thumbnail File should be present");
    }
   
    const {title, description} = req.body;

    const videoFile = await uploadOnCloudinary(videoFileLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if(!title?.trim()){
        throw new ApiError(400, "Title of a video is not present");
    }
    
    try {
        const video = await Video.create({
            title,
            videoFile: videoFile?.url,
            thumbnail: thumbnail?.url,
            description: description || null,
            owner: req.user?._id,
            views:0,
            isPublished:false,
            duration:videoFile?.quality_analysis.video.duration
        });
    
        return res
        .status(200)
        .json(
            new ApiResponse(200, video, "Video Uploaded Successfully")
        );
    } catch (error) {
        throw new ApiError(500, "Something went wrong, Video not uploaded");
    }
});

export {uploadVideo}