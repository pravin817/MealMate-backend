import express, { Request, Response } from "express";
import cors from "cors";
import "dotenv/config";
import mongoose from "mongoose";
import morgan from "morgan";
import myUserRoute from "./routes/MyUserRoute";
import { v2 as cloudinary } from "cloudinary";
import myRestaurantRoute from "./routes/MyRestaurantRoute";
import restaurantRoute from "./routes/RestaurantRoute";
import orderRoute from "./routes/OrderRoute";

// Connect with the database
mongoose
  .connect(process.env.MONGODB_CONNECTION_STRING as string)
  .then(() => {
    console.log("Connected to the database");
  })
  .catch((error) => {
    console.log("Error connecting to the database", error);
  });

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
app.use(cors());
app.use(morgan("dev"));

app.use("/api/order/checkout/webhook", express.raw({ type: "*/*" }));

app.use(express.json());

app.get("/", async (req: Request, res: Response) => {
  res.send({ message: "The server is running!" });
});

app.get("/health", async (req: Request, res: Response) => {
  res.send({ message: "Health is ok!" });
});

app.use("/api/my/user", myUserRoute);
app.use("/api/my/restaurant", myRestaurantRoute);
app.use("/api/restaurant", restaurantRoute);
app.use("/api/order", orderRoute);

// Listen
app.listen(8080, () => {
  console.log(`The server is running on localhost:8080`);
});
