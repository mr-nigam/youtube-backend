import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const subscriptionSchema = new mongoose.Schema(
    {
        subscriber: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        channel: {
            // the one to subscribers are subscribing
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        }
    },
    {timestamps: true}
);

subscriptionSchema.index(
  { subscriber: 1, channel: 1 },
  { unique: true }
);

subscriptionSchema.plugin(mongooseAggregatePaginate);

export const Subscription = 
    mongoose.model("Subscription",subscriptionSchema);