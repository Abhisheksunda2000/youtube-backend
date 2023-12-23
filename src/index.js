import donenv from "dotenv";
import express from "express";
import connectDB from "./db/db.js";

donenv.config({path:"./env"});
connectDB();