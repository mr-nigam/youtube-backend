import multer from "multer";


const storage = multer.diskStorage({
    destination: function(req,file,cb){
        cb(null,"public/temp")
    },
    filename: function(req,file,cb){
        const uniqueName = Date.now() + "-" + file.originalname;
        cb(null, uniqueName) //originalname
    }
});

// Add this custom filter to debug
const fileFilter = (req, file, cb) => {
    console.log("📁 Field name received:", file.fieldname);
    cb(null, true); // Accept all files temporarily
};


export const upload = multer({ storage,fileFilter });
