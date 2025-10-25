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
const PORT = 3000;

dotenv.config();
client.connect()
console.log("Database is conneceted on Atlas")
const allowedOrigins = [
  "http://localhost:5173",
  "https://olx-clone-jql7td3a9-abdul-majeeds-projects-e492b19d.vercel.app",
  "https://your-main-domain.vercel.app" // Add your main domain if different
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
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
