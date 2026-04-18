import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";


const videoSchema = new mongoose.Schema(
        {
            cloudinaryPublicFileId: {
                type: String, //cloudinary public_id + url
                required: true,
                trim: true,
            },
            cloudinaryPublicThumbnailId: {
                type: String, //cloudinary public_id + url
                required: true,
                trim: true,
            },
            videoUrl: {
                type: String,
                required: true,
            },
            thumbnailUrl: {
                type: String,
                required: true,
            },
            title: {
                type: String,
                required: true,
                trim: true,
            },
            description: {
                type: String,
                required: true,
                trim: true,
            },
            duration: {
                type: Number, //cloudinary
                required: true,
            },
            views: {
                type: Number,
                default: 0,
            },
            isPublished: {  
                type: Boolean,
                default: true,
            },
            owner: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
            size: {
                type: Number // bytes
            },
            tags: {
                type: [String],
                default: [],
            },
            likes: {
                type: Number,
                default: 0,
            }
    },
    {timestamps: true}
);

// Filter + sorting optimization
videoSchema.index({ owner: 1 });
videoSchema.index({ owner: 1, views: -1 });
videoSchema.index({ owner: 1, createdAt: -1 });

// Full-text search (single text index)
videoSchema.index(
  {
    title: "text",
    description: "text",
    tags: "text",
  },
  {
    weights: {
      title: 5,
      tags: 3,
      description: 1,
    },
  }
);

videoSchema.plugin(mongooseAggregatePaginate);


export const Video = mongoose.model("Video",videoSchema);