import Router from "express";
import { uploadVideo } from "../controllers/video.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js"; 


const router = Router();

//secured routes
router.route("/video-upload").post(
    verifyJWT, 
    upload.fields([
        {
            name:"videoFile",
            maxCount:1
        },
        {
            name:"thumbnail",
            maxCount:1
        }

    ]),
    uploadVideo
)

export default router;

