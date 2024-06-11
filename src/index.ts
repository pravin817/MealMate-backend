import express, { Request, Response } from "express";
import cors from "cors";
import "dotenv/config";
import mongoose from "mongoose";
import morgan from "morgan";
import myUserRoute from "./routes/MyUserRoute";

// Connect with the database
mongoose
  .connect(process.env.MONGODB_CONNECTION_STRING as string)
  .then(() => {
    console.log("Connected to the database");
  })
  .catch((error) => {
    console.log("Error connecting to the database", error);
  });

const app = express();
app.use(express.json());
app.use(cors());
// app.use(morgan("dev"));
app.use(morgan("dev"));

app.get("/health", async (req: Request, res: Response) => {
  res.send({ message: "Health is ok!" });
});

app.use("/api/my/user", myUserRoute);

// Listen
app.listen(8080, () => {
  console.log(`The server is running on localhost:8080`);
});
