import { asyncHandler } from "../utils/asyncHandler.js";


// we are creating methods now but we have to make URL also on which url it should work ....
const registerUser= asyncHandler( async (req,res)=>{ // asyncHandler is higher order function
    res.status(200).json({
        message:"ALL_IS_WELL!!"
    })
})


export {registerUser}