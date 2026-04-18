import mongoose from "mongoose";

const userIds = [
  new mongoose.Types.ObjectId("6801a1111111111111111111"),
  new mongoose.Types.ObjectId("6801a1111111111111111112"),
  new mongoose.Types.ObjectId("6801a1111111111111111113"),
  new mongoose.Types.ObjectId("6801a1111111111111111114"),
  new mongoose.Types.ObjectId("6801a1111111111111111115"),
  new mongoose.Types.ObjectId("6801a1111111111111111116"),
  new mongoose.Types.ObjectId("6801a1111111111111111117"),
  new mongoose.Types.ObjectId("6801a1111111111111111118"),
  new mongoose.Types.ObjectId("6801a1111111111111111119"),
  new mongoose.Types.ObjectId("6801a1111111111111111120")
];

const videos = [];

// 5 videos for each user = 50 total videos
userIds.forEach((userId, userIndex) => {
  for (let i = 1; i <= 5; i++) {
    videos.push({
      cloudinaryPublicFileId: `video_user${userIndex + 1}_${i}`,
      cloudinaryPublicThumbnailId: `thumb_user${userIndex + 1}_${i}`,
      videoUrl: `https://res.cloudinary.com/demo/video/upload/v1/video_user${userIndex + 1}_${i}.mp4`,
      thumbnailUrl: `https://res.cloudinary.com/demo/image/upload/v1/thumb_user${userIndex + 1}_${i}.jpg`,
      title: `User ${userIndex + 1} Video ${i}`,
      description: `This is video ${i} uploaded by user ${userIndex + 1}. Great content about coding, lifestyle and tutorials.`,
      duration: 180 + i * 20,
      views: Math.floor(Math.random() * 5000),
      isPublished: true,
      owner: userId,
      size: 25000000 + i * 500000,
      tags: ["tutorial", "vlog", `user${userIndex + 1}`, `video${i}`],
      likes: Math.floor(Math.random() * 1000)
    });
  }
});

export default videos;