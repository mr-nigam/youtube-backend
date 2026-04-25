import ApiError from "../utils/ApiError.js";


const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || "Internal Server Error";

    // Handle known ApiError
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: false,
            statusCode,
            message: err.message,
            errors: err.errors,
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined
        });
    }

    // Mongoose Bad ObjectId
    if (err.name === "CastError") {
        statusCode = 400;
        message = "Invalid resource ID";
    }

    // Mongoose Validation Error
    if (err.name === "ValidationError") {
        statusCode = 400;
        message = Object.values(err.errors)
            .map(val => val.message)
            .join(", ");
    }

    // Duplicate Key Error (MongoDB)
    if (err.code === 11000) {
        statusCode = 400;
        const field = Object.keys(err.keyValue).join(", ");
        message = `${field} already exists`;
    }

    return res
        .status(statusCode)
        .json({
            success: false,
            statusCode,
            message,
            errors: err.errors || [],
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined
        });
};


export { errorHandler };