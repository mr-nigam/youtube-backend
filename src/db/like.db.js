import mongoose from "mongoose";

const userIds = [
  "6801a1111111111111111111",
  "6801a1111111111111111112",
  "6801a1111111111111111113",
  "6801a1111111111111111114",
  "6801a1111111111111111115",
  "6801a1111111111111111116",
  "6801a1111111111111111117",
  "6801a1111111111111111118",
  "6801a1111111111111111119",
  "6801a1111111111111111120"
];

// 50 videos
const videoIds = Array.from({ length: 50 }, (_, i) =>
  new mongoose.Types.ObjectId()
);

// 120 comments
const commentIds = Array.from({ length: 120 }, (_, i) =>
  new mongoose.Types.ObjectId()
);

const likes = [];

/*
====================================
VIDEO LIKES
Each video gets 3 likes
50 x 3 = 150 likes
====================================
*/
videoIds.forEach((videoId, index) => {
  for (let i = 0; i < 3; i++) {
    likes.push({
      likedBy: new mongoose.Types.ObjectId(
        userIds[(index + i) % userIds.length]
      ),
      item: videoId,
      onModel: "Video"
    });
  }
});

/*
====================================
COMMENT LIKES
Each comment gets 2 likes
120 x 2 = 240 likes
====================================
*/
commentIds.forEach((commentId, index) => {
  for (let i = 0; i < 2; i++) {
    likes.push({
      likedBy: new mongoose.Types.ObjectId(
        userIds[(index + i + 3) % userIds.length]
      ),
      item: commentId,
      onModel: "Comment"
    });
  }
});

export default likes;