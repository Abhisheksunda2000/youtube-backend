import Router from "express";
import { getVideo, uploadVideo } from "../controllers/video.controller.js";
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

router.route("/c/:id").post(getVideo);

export default router;

