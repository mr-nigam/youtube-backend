import { Comment } from "../models/comment.models.js";
import { Video } from "../models/video.models.js";
import { Tweet } from "../models/tweet.models.js";


import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose, { isValidObjectId } from "mongoose";


const formatComment = (comment,user) => ({
    _id: comment._id,
    content: comment.content,
    itemId: comment.item,
    item: comment.onModel,
    owner: {
        _id: user._id,
        username: user.username,
        avatar: user.avatar
    },
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    isEdited: comment.createdAt !== comment.updatedAt
});

const getComments = asyncHandler( async(req,res) =>{
    const {itemId,model} = req.params;
});

const addComment = asyncHandler(async (req, res) => {
    const {itemId,model} = req.params;

    if(!itemId || !isValidObjectId(itemId) || !model){
        throw new ApiError(400, `Invalid ${model} id`);
    }

    const content = req.body.content?.trim();
    if(!content){
        throw new ApiError(400,"Please write something in comment");
    }
    
    const modelMap = {
        Video,
        Tweet,
        Comment
    };
    
    const Model = modelMap[model];
    if(!Model){
        throw new ApiError(400, "Invalid item type");
    }
    const itemExists = await Model.exists({ _id: itemId });
    
    if (!itemExists) {
        throw new ApiError(404, `${model} not found`);
    }
    
    const comment = await Comment.create({
        content: content, 
        owner: req.user._id,
        item: itemId,
        onModel: model,
    });

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                formatComment(comment,req.user),
                "Comment created successfully"
            )
        );
});

const updateComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params;

    if(!commentId || !isValidObjectId(commentId)){
        throw new ApiError(400, `Invalid comment id`);
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
    );

    if(!updatedComment){
        throw new ApiError(404,"Comment not found or unauthorized");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                formatComment(updatedComment,req.user),
                "Comment updated successfully"
            )
        );

});

const deleteComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params;

    if(!commentId || !isValidObjectId(commentId)){
        throw new ApiError(400, `Invalid comment id`);
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
                true,
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


