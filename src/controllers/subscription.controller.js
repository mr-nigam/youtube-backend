import mongoose, {isValidObjectId} from "mongoose";
import { Subscription } from "../models/subscription.model.js";
import {ApiError} from "../utils/ApiError.js";
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

// learn pagination for optimal fetching
// controller to return subscriber list of a channel
const getChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params;

    if(!channelId || isValidObjectId(channelId)){
         throw new ApiError(400,`Invalid channel id`);
    }

    const subscribersList = await Subscription.find({
        channel: channelId
    })
        .populate("subscriber","username avatar")
        .sort({ creaedAt: -1 })
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
const getMySubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params;

    if(!channelId || isValidObjectId(channelId)){
         throw new ApiError(400,`Invalid channel id`);
    }

    const subscribersList = await Subscription.find({
        channel: channelId
    })
        .populate("subscriber","username avatar")
        .sort({ creaedAt: -1 })
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

// learn pagination for optimal fetching
// controller to return channel list to which user has subscribed
const getMySubscribedChannels = asyncHandler(async (req, res) => {
    const subscribedList = await Subscription.find({
        subscriber: req.user._id
    })
        .populate("channel","username avatar")
        .sort({creaedAt: -1})
        .lean();

    let message = subscribedList.length === 0
        ? "You have not subscribed to any channel"
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

// learn pagination for optimal fetching
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;

    if(!subscriberId || isValidObjectId(subscriberId)){
         throw new ApiError(400,`Invalid subscriber id`);
    }
    const subscribedList = await Subscription.find({
        subscriber: subscriberId
    })
        .populate("channel","username avatar")
        .sort({creaedAt: -1})
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
    getChannelSubscribers,
    getMySubscribers,
    getSubscribedChannels,
    getMySubscribedChannels,
}