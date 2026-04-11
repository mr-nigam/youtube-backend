import mongoose from "mongoose";
import mongooseAggregatePaginate 
    from "mongoose-aggregate-paginate-v2";


const commentSchema = new mongoose.Schema(
    {
        content: {
            type: String,
            required: true,
            trim: true
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        video: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Video",
            required: true,
        }
    },
    {timestamps: true}
);

commentSchema.index({ video: 1, createdAt: -1 });

commentSchema.plugin(mongooseAggregatePaginate);

export const Comment = mongoose.model("Comment",commentSchema);