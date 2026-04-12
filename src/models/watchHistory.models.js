import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";


const watchHistorySchema = new mongoose.Schema(
    {
        watchedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        video: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Video",
            required: true
        },
        watchedAt: {
            type: Date,
            default: Date.now,
            expires: 60 * 60 * 24 * 30 // 30 days
        }
    },
    {timestamps: true}
);

// recent history
watchHistorySchema.index({watchedBy: 1, watchedAt: -1});

// prevent duplicates (used with upsert)
watchHistorySchema.index(
    { watchedBy: 1, video: 1 },
    { unique: true }
);

watchHistorySchema.plugin(mongooseAggregatePaginate);

export const WatchHistory = mongoose
    .model("WatchHistory",watchHistorySchema);


/*
await WatchHistory.findOneAndUpdate(
  { watchedBy: userId, video: videoId },
  { $set: { watchedAt: new Date() } },
  { upsert: true, new: true }
);
*/