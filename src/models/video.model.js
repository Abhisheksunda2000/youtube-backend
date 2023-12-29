import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = mongoose.Schema({
    title:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    owner:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    },
    duration:{
        type:Number,
        required:true
    },
    thumbnail:{
        type:String,
        required:true
    },
    videoFile:{
        type:String,
        required:true
    },
    isPublished:{
        type:Boolean,
        default:true
    },
    views:{
        type:Number,
        default:0
    }

},{timestamps:true});

videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model("Video", videoSchema);