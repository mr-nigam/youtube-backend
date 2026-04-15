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
        item: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            refPath: "onModel"
        },
        onModel: {
            type: String,
            required: true,
            enum: ["Video","Comment","Tweet"]
        },
        replyCount: {
            type: Number,
            default: 0
        }
    },
    {timestamps: true}
);

commentSchema.index({ item: 1, onModel: 1, createdAt: -1 });

commentSchema.plugin(mongooseAggregatePaginate);


export const Comment = mongoose.model("Comment",commentSchema);