import { Comment } from "../models/comment.models.js";
import { Video } from "../models/video.models.js";
import { Tweet } from "../models/tweet.models.js";


import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose, { isValidObjectId } from "mongoose";


const modelMap = {
    Video,
    Tweet,
    Comment
};

const allowedModels = ["Video", "Comment", "Tweet"];

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
    replyCount: replyCount,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    isEdited: comment.createdAt !== comment.updatedAt
});

const getComments = asyncHandler( async(req,res) =>{
    let { page = 1, sortBy, sortType } = req.query;
    page = parseInt(page,10) || 1;

    const limit = 25;
    const skip = (page-1)*limit;

    const {itemId, model} = req.params;
    if(!itemId || !isValidObjectId(itemId) || !allowedModels.includes(model)){
        throw new ApiError(400, "Invalid item id or model");
    }

    const sortTypeVal = sortType?.toLowerCase();
    const sortOrder = sortTypeVal === "asc"? 1: -1;

    sortBy = sortBy?.trim() || "createdAt";

    const filters = {
        item: itemId,
        onModel: model
    };
    const sortOptions = {
        [sortBy]: sortOrder
    };

    const comments = await Comment.find(filters)
        .populate("owner","username avatar")
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean();

    const totalComments = await Comment.countDocuments(filters);

    const formattedComments = comments.map( 
        comment => formatComment(comment,comment.owner)
    );

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    page,
                    limit,
                    totalComments,
                    totalPages: Math.ceil(totalComments / limit),
                    data: formattedComments
                },
                "Comments fetched successfully"
            )
        );
});

const addComment = asyncHandler(async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try{
        const {itemId,model} = req.params;

        if(!itemId || !isValidObjectId(itemId) || !allowedModels.includes(model)){
            throw new ApiError(400, `Invalid ${model} id`);
        }
        
        const content = req.body.content?.trim();
        if(!content){
            throw new ApiError(400,"Please write something in comment");
        }
        
        const Model = modelMap[model];
        if(!Model){
            throw new ApiError(400, "Invalid item type");
        }

        const itemExists = await Model.exists({ _id: itemId }).session(session);
        if(!itemExists){
            throw new ApiError(404, `${model} not found`);
        }
    
        const comment = await Comment.create(
            [{
                content,
                owner: req.user._id,
                item: itemId,
                onModel: model,
            }],
            { session }
        );

        if (model === "Comment") {
            await Promise.all([
                Comment.findByIdAndUpdate(
                    itemId,
                    { $inc: { replyCount: 1 } },
                    { session }
                )
            ]);
        }

        // ✅ Commit transaction
        await session.commitTransaction();
        session.endSession();

        return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                formatComment(comment,req.user),
                "Comment created successfully"
            )
        );
    }catch(err){
        //Rollback everything
        await session.abortTransaction();
        session.endSession();
        throw new ApiError(400, err.message|| "Error while posting commment");
    }
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
            new: true,
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
    const session = await mongoose.startSession();
    session.startTransaction();


    try{
        const {commentId} = req.params;
        if(!commentId || !isValidObjectId(commentId)){
            throw new ApiError(400, `Invalid comment id`);
        }

        const deletedComment = await Comment.findOneAndDelete({
            _id: commentId,
            owner: req.user._id
        }).session(session);

        if (!deletedComment) {
            throw new ApiError(404, "Comment not found or unauthorized");
        }

        //  Decrement reply count if it's a reply
        if(deletedComment.onModel === "Comment" && deletedComment.item){
            await Comment.findByIdAndUpdate(
                deletedComment.item,
                { 
                    $inc: {replyCount: -1},
                    $max: { replyCount: 0 }
                },
                {session}
            );
        }
        
         // delete its replies (cascade)
        await Comment.deleteMany(
            {
                item: deletedComment._id,
                onModel: "Comment"
            },
            {session}
        );

        await session.commitTransaction();
        session.endSession();
        
        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                true,
                "Comment deleted successfully"
            )
        );
    }catch(err){
        await session.abortTransaction();
        session.endSession();
        throw new ApiError(400, err.message|| "Error while deleting commment");
    }
});


export{
    getComments,
    addComment,
    updateComment,
    deleteComment
}


