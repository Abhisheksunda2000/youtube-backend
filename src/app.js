import express from "express";

const app = express();


// configurations
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials:true
}));

app.use(express.json({limit:"16kb"}));
app.use(express.urlencoded({extended:true, limit:"16kb"}));
app.use(express.static("public"));
app.use(cookieParser());

app.on("error", (error) =>{
    console.log("");
    throw error;
 });

export {app}