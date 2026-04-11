import mongoose from "mongoose";


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

// well return new first in sorted order
tweetSchema.index({postedBy: 1, createdAt: -1});

export const Tweet = mongoose.model("Tweet",tweetSchema);





