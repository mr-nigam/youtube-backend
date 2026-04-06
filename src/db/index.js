import 'dotenv/config';
import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
    try {
        const conn_Instance = await mongoose.connect(
            `${process.env.MONGODB_URL}/${DB_NAME}`
        );

        console.log(`\n MONGODB connected !! DB HOST: ${conn_Instance.connection.host}`);

    } catch (error) {
        console.log("\n MONGODB connection FAILED", error);
        process.exit(1);
    }
}

export default connectDB;