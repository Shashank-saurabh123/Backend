import  express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app =express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

// routes import

import userRouter from './routes/user.routes.js'

// routes declaration
app.use("/api/v1/users",userRouter)// here we are using .use not .get because all the controllers and routes is not in this same filr
                             //it will work as a middleware so ya .use (api/v1 -- just for good practices)



// http://localhost:8000/api/v1/users/register-----> how it works ----> it hits on users route then it 
// searchs for userRouter came from and there it is listening to whiich method  that has been written in
// our controllers file.

export{ app }