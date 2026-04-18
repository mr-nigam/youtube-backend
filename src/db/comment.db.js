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

// 50 videos (same order as previous seed file)
const videoIds = Array.from({ length: 50 }, (_, i) =>
  new mongoose.Types.ObjectId()
);

const comments = [];

/*
  2 comments on every video = 100 comments
*/
videoIds.forEach((videoId, index) => {
  for (let i = 1; i <= 2; i++) {
    comments.push({
      content: `Amazing video ${index + 1}! Comment ${i}. Really enjoyed watching this content.`,
      owner: new mongoose.Types.ObjectId(
        userIds[(index + i) % userIds.length]
      ),
      item: videoId,
      onModel: "Video",
      replyCount: 0
    });
  }
});

/*
  Replies to first 20 comments = 20 nested replies
*/
for (let i = 0; i < 20; i++) {
  const parentCommentId = new mongoose.Types.ObjectId();

  comments.push({
    _id: parentCommentId,
    content: `Main comment thread ${i + 1}`,
    owner: new mongoose.Types.ObjectId(userIds[i % userIds.length]),
    item: videoIds[i],
    onModel: "Video",
    replyCount: 1
  });

  comments.push({
    content: `Reply to comment ${i + 1}. Thanks for your feedback!`,
    owner: new mongoose.Types.ObjectId(
      userIds[(i + 2) % userIds.length]
    ),
    item: parentCommentId,
    onModel: "Comment",
    replyCount: 0
  });
}

export default comments;