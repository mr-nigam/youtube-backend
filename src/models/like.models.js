import mongoose from "mongoose";


const likeSchema = new mongoose.Schema(
    {
        likedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        item: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            refPath: "onModel"
        },
        // read it from mongo document
        onModel: {
            type: String,
            required: true,
            enum: ["Video","Comment","Tweet"]
        }
    },
    {timestamps: true}
);

likeSchema.index(
  {likedBy: 1, item: 1, onModel: 1},
  {unique: true}
);

likeSchema.index({item: 1, onModel: 1});


export const Like = mongoose.model("Like",likeSchema);