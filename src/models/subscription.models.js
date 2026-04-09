import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
    {
        subscribers:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        channel: {
            // the one to subscribers are subscribing
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    },
    {timestamps: true}
);


export const Subscription = 
    mongoose.model("Subscription",subscriptionSchema);