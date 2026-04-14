import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";


const userSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true,
            trim: true,
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
            index: true
        },
        password: {
            type: String,
            required: [true,"Password is required"],
            minlength: 8,
            select: false,
        },
        avatar: {
            type: String,// cloudinary url
            required: true,
        },
        avatarPublicId: {
            type: String,// cloudinary public id
            required: true,
        },
        coverImage: {
            type: String,// cloudinary url
            default: "",
        },
        coverImagePublicId: {
            type: String,// cloudinary public id
            default: ""
        },
         totalViews: {
            type: Number,
            default: 0,
        },
        about: {
            type: String,
            trim: true,
            maxlength: 500
        },
        refreshToken: {
            type: String,
            select: false, // security improvement
        },
        socialLinks: {
            youtube: { type: String, default: "" },
            instagram: { type: String, default: "" },
            twitter: { type: String, default: "" },
            website: { type: String, default: "" }
        },
        location: {
            type: String,
            trim: true,
            default: ""
        }
       
    },
    {timestamps: true}
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.isPasswordCorrect = async function(password) {
    if(password){
        return await bcrypt.compare(password,this.password);
    }
};

userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
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
