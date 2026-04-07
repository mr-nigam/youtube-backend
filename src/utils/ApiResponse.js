class ApiResponse{
    constructor(
        statusCode,
        data,
        message = "Success"
    ){
        this.statusCode = statusCode;
        this.data = data;
        this.message = message;
        this.success = statusCode < 400;
    }
}

export default ApiResponse;


// use case
/*
res.status(200).json(
    new ApiResponse(200, user, "User fetched successfully")
)
*/