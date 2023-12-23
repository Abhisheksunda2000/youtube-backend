import donenv from "dotenv";
import express from "express";
import connectDB from "./db/db.js";
import app from "./app.js";

donenv.config({path:"./env"});

connectDB()
.then(() =>{
     app.listen(process.env.PORT || 8000, () =>{
        console.log(`server is running at port : ${process.env.PORT}`);
     })
})
.catch((error) =>{
    console.log("MONGO db connection failed !!! ", error);
})