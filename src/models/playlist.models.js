import mongoose from "mongoose";


const playlistSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            required: true,
            trim: true
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        videos: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Video"
            }
        ],
        privacy: {
            type: String,
            enum: ["public","private","unlisted"],
            default: "public"
        },
    },
    {timestamps: true}
);

playlistSchema.index({owner: 1, createdAt: -1 });

// Add this only if you query playlists by video
// Example use cases:
// - find playlists containing a video
// - remove video from all playlists
// - check if video exists in any playlist
// playlistSchema.index({ videos: 1 });


export const Playlist = mongoose.model("Playlist",playlistSchema);





