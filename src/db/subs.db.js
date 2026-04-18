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

const subscriptions = [];

/*
Each user subscribes to next 3 users
No self-subscription
Total = 10 x 3 = 30 subscriptions
*/

for (let i = 0; i < userIds.length; i++) {
  for (let j = 1; j <= 3; j++) {
    subscriptions.push({
      subscriber: new mongoose.Types.ObjectId(userIds[i]),
      channel: new mongoose.Types.ObjectId(
        userIds[(i + j) % userIds.length]
      )
    });
  }
}

export default subscriptions;