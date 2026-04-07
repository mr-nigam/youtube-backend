import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";


const userSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        username: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            unique: true,
            index: true,
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            unique: true,
            match: [/.+\@.+\..+/, "Please use a valid email"],
        },
        avatar :{
            type: String,// cloudinary url
            required: true,
        },
        coverImage: {
            type: String,// cloudinary url
            default: "",
        },
        watchHistory: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Video",
            },
        ],
        password: {
            type: String,
            required: [true,"Password is required"],
            minlength: 8,
            select: false,
        },
        refreshToken: {
            type: String,
            select: false, // security improvement
        },
        // followers
        subscribers: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",   
            }
        ],
        // following
        subscriptions: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",   
            }
        ],
        likedVideos: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Video",
            },
        ],
        subscribersCount: {
            type: Number,
            default: 0
        },

        subscriptionsCount: {
            type: Number,
            default: 0
        }
    },
    {timestamps: true}
);

userSchema.pre("save", async function(next) {
    if(!this.isModified("password")) return next();
    
    this.password = await bcrypt.hash(this.password,10);
    next();
});

userSchema.methods.isPasswordCorrect = async function(password) {
    if(password){
        return await bcrypt.compare(password,this.password);
    }
}

userSchema.methods.generateAccessToken = async function () {
    return await jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    );
};

userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    );
};

export const User = mongoose.model("User",userSchema);
