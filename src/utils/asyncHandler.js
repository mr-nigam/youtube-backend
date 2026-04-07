const asyncHandler = (requestHandler) => 
    async (req, res, next) => {
   
    Promise.resolve(requestHandler(req, res, next))
        .catch((err)=> next(err));

}

export default asyncHandler;


//const asyncHandler1 = (fn) => {() =>{}};
//const asyncHandler1 = (fn) => async() =>{};
// const asyncHandler1 = (fn) => async(err,req,res,next) =>{
//     try{
//         await fn(err,req,res,next);
//     }catch(error){
//         res.status(err.code || 500).json({
//             success: false,
//             message: err.message
//         });
//     }
// }