import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import multer from "multer";


const app = express();
const upload = multer();


app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

app.use(express.json({
    limit: "16kb",
}));

app.use(express.urlencoded({
    extended: true,
    limit: "16kb"
}));

app.use(upload.none()); // for text-only form-data

app.use(express.static("public"))

app.use(cookieParser());


// import routes
import userRouter from "./routes/user.routes.js" 


// routes declaration

app.use("/api/v1/users",userRouter);

/*
https://localhost:3000/api/v1/users/register
*/
export default app;