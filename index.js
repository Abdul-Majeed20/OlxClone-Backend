import express from "express";
import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
const app = express();
import { client } from "./dbConfig.js";

dotenv.config();
client.connect()
console.log("Database is conneceted on Atlas")
const PORT = process.env.PORT || 3000;
// app.use(
//   cors({
//      origin: ["https://olx-clone-sigma-three.vercel.app", "http://localhost:5173"], // your frontend origin
//     credentials: true,
//   })
// );

app.use(
  cors({
    origin: true, // Reflects the request origin automatically
    credentials: true,
  })
);

app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

app.use(express.json());


app.use(authRoutes);

app.use((req, res, next) => {
  try {
    let decoded = jwt.verify(req.cookies.token, process.env.SECRET_KEY);
    next();
  } catch (error) {
    return res.send({
      status: 0,
      error: error,
      message: "Invalid Token",
    });
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

app.use(productRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on PORT ${PORT}`);
});
