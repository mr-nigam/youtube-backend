import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import ApiError from "./utils/ApiError.js";


const app = express();


app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

app.use(express.json({ limit: "16kb", }));
app.use(express.urlencoded({ extended: true,limit: "16kb" }));
app.use(express.static("public"))
app.use(cookieParser());    


// logger
app.use((req, res, next) => {
    console.log("METHOD:", req.method);
    console.log("URL:", req.url);
    next();
});

// Routes
import userRouter from "./routes/user.routes.js";
import videoRouter from "./routes/video.routes.js"; 
import commentRouter from "./routes/comment.routes.js"; 
import likeRouter from "./routes/like.routes.js"; 
import tweetRouter from "./routes/tweet.routes.js"; 
import playlistRouter from "./routes/playlist.routes.js"; 
import subscriptionRouter from "./routes/subscription.routes.js"; 


app.use("/api/v1/users", userRouter);
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/tweets", tweetRouter);
app.use("/api/v1/playlists", playlistRouter);
app.use("/api/v1/subscriptions", subscriptionRouter);

//404 handler (must be before errorHandler)
app.use((req, res, next) => {
    next(new ApiError(404, "Route not found"));
});

// Global error handler (must be last)
import { errorHandler } from "./middlewares/error.middleware.js";
app.use(errorHandler);


export default app;