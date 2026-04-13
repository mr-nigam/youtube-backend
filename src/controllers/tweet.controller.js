import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const formatTweet = (tweet,user)=>{
    const isEdited = tweet.createdAt !== tweet.updatedAt;

    return {
        _id: tweet._id,
        content: tweet.content,
         ...(user && {
            postedBy: {
                _id: user._id,
                avatar: user.avatar,
                username: user.username,
            }
        }),
        createdAt: tweet.createdAt,
        isEdited: isEdited,
        updatedAt: isEdited? tweet.updatedAt: null,
    };
};

// Learn and do pagination for better and smooth fetching
const getUserTweets = asyncHandler(async (req, res) => {
    
    const accountId = req.params?.accountId;
    if(!accountId || !isValidObjectId(accountId)){
        throw new ApiError(400, `invalid account id`); 
    }

    // for parallen execution
    const [tweets, postedby] = await Promise.all([
        Tweet.find({ postedBy: accountId })
            .sort({ createdAt: -1 })
            .lean(),
            
        User.findById(accountId)
            .select("username avatar")
            .lean()
    ]);

    if(tweets.length===0){
        return res.status(200).json(
             new ApiResponse(200, { allTweets: [], postedBy: null }, "No tweets found")
        );
    }

    const allTweets = tweets.map( t => formatTweet(t,null));
    
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {allTweets, postedby},
                "All tweets fetched successfully"
            )
        );

});

const getMyTweets = asyncHandler(async (req, res) => { 
    
    const tweets = await Tweet.find(
        {postedBy: req.user._id})
        .sort({ createdAt: -1 })
        .lean();

    if(tweets.length===0){
        return res.status(200).json(
             new ApiResponse(200, { allTweets: [], postedBy: null }, "No tweets found")
        );
    }

    const postedBy = {
        _id: req.user._id,
        username: req.user.username,
        avatar: req.user.avatar
    }
    
    const allTweets = tweets.map( t => formatTweet(t,null));

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {allTweets, postedBy},
                "All tweets fetched successfully"
            )
        );
});

const createTweet = asyncHandler(async (req, res) => {

    const content = req.body?.content?.trim();
    if(!content){
        throw new ApiError(400,"Content cannot be empty");
    }
    
    const tweet = await Tweet.create({
        content: content,
        postedBy: req.user._id
    });
    
    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                formatTweet(tweet,req.user),
                "Tweet posted successfully"
            )
        );
});

const updateTweet = asyncHandler(async (req, res) => {

    const tweetId = req.params?.tweetId;
    if(!tweetId || !isValidObjectId(tweetId)){
        throw new ApiError(400, `invalid tweet id`); 
    }

    const content = req.body?.content?.trim();
    if(!content){
        throw new ApiError(400,"Content cannot be empty");
    }

    const updatedTweet = await Tweet.findOneAndUpdate(
        { _id: tweetId, postedBy: req.user._id},
        {$set: {content: content}},
        {new: true, runValidators: true }
    );

    if(!updatedTweet){
        throw new ApiError(404, "Tweet not found or unauthorized");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                formatTweet(updatedTweet,req.user),
                "Tweet updated successfully"
            )
        );

});

const deleteTweet = asyncHandler(async (req, res) => {

    const tweetId = req.params?.tweetId;
    if(!tweetId || !isValidObjectId(tweetId)){
        throw new ApiError(400, `invalid tweet id`); 
    }

    const deletedTweet = await Tweet.findOneAndDelete(
        { _id: tweetId, postedBy: req.user._id},
    );

    if(!deletedTweet){
        throw new ApiError(404, "Tweet not found or unauthorized");
    }

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    { deletedTweetId: tweetId },
                    "Tweet deleted successfully"
                )
            );
});

const getTweet = asyncHandler(async (req,res)=>{
    const tweetId = req.params?.tweetId;
    
    if(!tweetId || !isValidObjectId(tweetId)){
        throw new ApiError(400, `invalid tweet id`); 
    }

    const tweet = await Tweet.findById(tweetId);
    if(!tweet){
        throw new ApiError(404, "Tweet not found");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                formatTweet(tweet, req.user),
                "Tweet fecthed successfully"
            )
        );
});

export {
    getUserTweets,
    getMyTweets,
    createTweet,
    updateTweet,
    deleteTweet,
    getTweet
}