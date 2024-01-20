import mongoose,{Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
    {
     videoFile:{
        type:String,// cloudnary url
        required:true,
     },
     thumbnail:{
        type:String,//cloudnary url
        required:true,
     },
     title:{
        type:String,
        required:true
     },
     description:{
        type:String,
        required:true
     },
     duration:{
        type:Number,// through cloudnary only ,when cloudnary sends info in that process only it sends all the info of video along with its (duration)
        required:true
     },
     views:{
        type:Number,
        default:0
     },
     isPublished:{
        type:Boolean,
        default:true,
     },
     videoOwner:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
     }
    },
    {
        timestamps:true,
    }
)
videoSchema.plugin(mongooseAggregatePaginate)// now we can write aggregate quires in mongo DB

export const Video = mongoose.model("Video",videoSchema)