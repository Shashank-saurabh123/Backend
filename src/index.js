// require('dotenv').config({path:'./env'}) // it will work fine but it will affect the consistency of code badly
// for alternative of this see line no. 3 and 5
import dotenv from "dotenv"

import connectDB from "./db/index.js";

dotenv.config({
    path:'./env'
})

























/* 1st approach
import mongoose from "mongoose";
import { DB_NAME } from "./constants";
import express from "express"
const app=express()

;(async()=>{
    try {
     await   mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
     app.on("error",(error)=>{  // this is expres ka part if my DB is not able to listen then throw error
        console.log("ERROR:",error);
        throw error
     })
     app.listen(process.env.PORT,()=>{
        console.log(`App is listening on port ${process.env.PORT}`);
     })
    } catch (error) {
        console.error("ERROR:",error)
        throw err
    }
}) ()// iffi likha hua hai,';' is just for cleaning purposes
*/

