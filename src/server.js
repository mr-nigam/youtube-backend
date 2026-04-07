import 'dotenv/config';
import connectDB from "./db/index.js";
import app from "./app.js";


connectDB()
    .then(()=>{ 
        app.on("error",(error)=>{
            console.log("Error: ",error);
            throw error;
        });
        
        app.listen(process.env.PORT ||8000, ()=>{
            console.log(`Server is running at port: 
                ${process.env.PORT}`);
        });
    })
    .catch((err)=>{
        console.log("MONGO db connection faild !!!", err);
    }
);



















/*
import express from "express";
const app = express();
// iffi
;(async () => {
    try{
        await mongoose.connect(`${process.env.MONGODB_URL}`/`${DB_NAME}`);
        
        app.on("error",(error)=>{
            console.log("Error: ",error);
            throw error;
        });

        app.listen(process.env.PORT,()=>{
            console.log(`"App is listening on port${process.env.PORT}`);
        })
    }catch(error){
        console.error("Error: ",error);
        throw error;
    }
})()

*/


