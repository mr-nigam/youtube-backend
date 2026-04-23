import { isValidObjectId } from "mongoose";
import { Subscription } from "../models/subscription.models.js";
import ApiError from "../utils/ApiError.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import {asyncHandler} from "../utils/asyncHandler.js";


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    
    if(!channelId || !isValidObjectId(channelId)){
        throw new ApiError(400,`Invalid channel id`);
    }

    const existingSubscription  = await Subscription.findOneAndDelete({
        channel: channelId,
        subscriber: req.user._id
    });
    
    // take it as unsubscriber by default
    let isSubscribed = false;
    let message = "Channel unsubscribed successfully";
    
    // if not subscriber then do subscriber 
    if(!existingSubscription){
        await Subscription.create({
            channel: channelId,
            subscriber: req.user._id
        });
        isSubscribed = true;
        message = "Channel subscribed successfully";
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    channelId,
                    isSubscribed
                },
                message
            )
        );
});

// return subscriber list of a channel
const getSubscribers = asyncHandler(async (req, res) => {
    let {channelId} = req.params; 

    // If no channelId passed, use logged-in user channel
    channelId = channelId || req.user._id;
    
    if(!channelId || !isValidObjectId(channelId)){
        throw new ApiError(400,`Invalid channel id`);
    }
    
    let {page = 1, limit, sortBy, sortType} = req.query;

    page = Math.max(parseInt(page, 10) || 1, 1);
    limit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 25);
    const skip = (page-1)*limit;

    sortType = sortType?.trim().toLowerCase();
    const sortOrder = sortType === "asc"? 1: -1;

    const filters ={};
    filters.channel = channelId;
    
    const allowedSortFields = ["createdAt", "updatedAt"];
    if (!allowedSortFields.includes(sortBy)) {
        sortBy = "createdAt";
    }


    const sortOptions = {
        [sortBy]: sortOrder
    };

    const subscribersList = await Subscription.find(filters)
        .select("_id subscriber")
        .populate("subscriber","username avatar")
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean();

    
    let message = subscribersList.length === 0
        ? "Channel has zero subscribers"
        : "Subscribers fetched successfully";

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                subscribersList,
                message
            )
        );

});

// return channel list to which user/channelId has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    let { subscriber } = req.params;
    subscriber = subscriber || req.user._id;

    if(!subscriber || !isValidObjectId(subscriber)){
        throw new ApiError(400,`Invalid subscriber id`);
    }

    let {page = 1, limit, sortBy, sortType} = req.query;
    
    page = Math.max(parseInt(page, 10) || 1, 1);
    limit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 25);
    const skip = (page-1)*limit;

    sortType = sortType?.trim().toLowerCase();
    const sortOrder = sortType === "asc"? 1: -1;

    const filters ={};
    filters.subscriber = subscriber;
    
    const allowedSortFields = ["createdAt", "updatedAt"];
    if (!allowedSortFields.includes(sortBy)) {
        sortBy = "createdAt";
    }

    const sortOptions = {
        [sortBy]: sortOrder
    };

    const subscribedList = await Subscription.find(filters)
        .select("_id channel")
        .populate("channel","username avatar")
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean();

     let message = subscribedList.length === 0
        ? "This user have not subscribed to any channel"
        : "Subscribed channels fetched successfully";


    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                subscribedList,
                message
            )
        );

});


export {
    toggleSubscription,
    getSubscribers,
    getSubscribedChannels,
}