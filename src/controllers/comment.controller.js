import { Comment } from "../models/comment.models.js";
import { Video } from "../models/video.models.js";

import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";



const formatComment = (comment) => ({
    _id: comment._id,
    content: comment.content,
    videoId: comment.video,
    owner: comment.owner,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    isEdited: comment.createdAt !== comment.updatedAt
});

const getComments = asyncHandler( async(req,res) =>{
    const {videoId} = req.params;

});

const addComment = asyncHandler(async (req, res) => {
    const {videoId} = req.params;
    if(!videoId){
        throw new ApiError(400,"Video id is missing");
    }
    
    const content = req.body.content?.trim();
    if(!content){
        throw new ApiError(400,"Please write something in comment");
    }

    const videoExists = await Video.exists({ _id: videoId });
    if (!videoExists) {
        throw new ApiError(404, "Video not found");
    }
    
    const comment = await Comment.create({
        content: content, 
        owner: req.user._id,
        video: videoId,
    });

    const populatedComment = await comment.populate("owner", "username avatar");

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                formatComment(populatedComment),
                "Comment created successfully"
            )
        );
});

const updateComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params;
    if(!commentId){
        throw new ApiError(400,"Comment id is missing");
    }
    
    const content = req.body.content?.trim();
    if(!content){
        throw new ApiError(400,"Please write something in comment");
    }

    const updatedComment = await Comment.findOneAndUpdate(
        {
            _id: commentId,
            owner: req.user._id
        },
        {
            $set: {content}
        },
        {
            new: true, // return updated doc
            runValidators: true
        }
    ).populate("owner","username avatar");

    if(!updatedComment){
        throw new ApiError(404,"Comment not found or unauthorized");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                formatComment(updatedComment),
                "Comment updated successfully"
            )
        );

});

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    if(!commentId){
        throw new ApiError(400,"Comment id is missing");
    }

    const deletedComment = await Comment.findOneAndDelete({
        _id: commentId,
        owner: req.user._id
    });

    if (!deletedComment) {
        throw new ApiError(404, "Comment not found or unauthorized");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                null,
                "Comment deleted successfully"
            )
        );

});

export{
    getComments,
    addComment,
    updateComment,
    deleteComment
}


