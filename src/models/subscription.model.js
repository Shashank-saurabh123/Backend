import mongoose, {Schema} from "mongoose";


const subscriptionSchema= new Schema({
    subscriber:{// give the no.of video subscribed by id or channel
        type:Schema.Types.ObjectId, // one who is subscribing
        ref:"User"
    },
    channel:{  // give the count of subscribers
        type:Schema.Types.ObjectId,  // to whome sunscriber is subscribing
        ref:"User"
    }

},{timestamps:true})


export const Subscription = mongoose.model("Subscription",subscriptionSchema)