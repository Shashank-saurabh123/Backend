import mongoose,{Schema} from "mongoose";
import  Jwt from "jsonwebtoken";
import  bcrypt from "bcrypt";

const userSchema =new Schema(
    {
       username:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
        index:true,// in DB if we want to make in field more easily searchable then we set inde to true,it makes slow also 
       },
       email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
       },
       fullName:{
        type:String,
        required:true,
        trim:true,
        index:true,
       },
       avtar:{
        type:String,// from cloudnary we will get
        required:true,
       },
       coverImages:{
        type:String,// same cloudnary things 
       },
       watchHistory:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"Video"
        }
       ],
       password:{
        type:String,
        required:[true,'password is required'],
       },
       refreshToken:{
        type:String,
       }
       

    },
    {
        timestamps:true,
    }
)
userSchema.pre("save",async function (next)
{
    if(!this.isModified("password")) return next();
  // else agar modify hua hai password to  password mein changes kro

  this.password= bcrypt.hash(this.password,10);// now password is bcrypted
  next();
    
})
//we can design custom methods also in mongoose
// we are checking that weather the given password by user is matching from the encrypted version of password ,what actually has been saved in db

userSchema.methods.isPasswordCorrect = async function (password){
    return await bcrypt.compare(password,this.password)// paasword is by user and this.password it's taking from db and making it compare
                                                       // because it is based on cryptography so need time hence await,
                                                       //it returns boolean value in form of true and false
}

// now we are gonna to write methods to generate accestoken and refreshtoken as well

userSchema.methods.generateAccessToken = function(){
    return Jwt.sign(
        {
            // we are writting payloads here 
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName
        },
        // expiry goes in to object (syntax hai basic)
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
userSchema.methods.generateRefreshToken = function(){
    return Jwt.sign(
        {
            // refresh token contains less data so less apyloads here
            _id: this._id,// lhs is my payload name but rhs is coming from DB
            
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}


export const User = mongoose.model("User",userSchema)