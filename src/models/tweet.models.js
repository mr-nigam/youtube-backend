import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const tweetSchema = new mongoose.Schema(
    {
        content: {
            type: String,
            required: true,
            trim: true
        },
        postedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
    },
    {timestamps: true}
);
    
tweetSchema.index({postedBy: 1, createdAt: -1});

tweetSchema.plugin(mongooseAggregatePaginate);

export const Tweet = mongoose.model("Tweet",tweetSchema);