// import { MongoClient } from "mongodb";

// const Uri = "mongodb+srv://ABM:AbMajeed1@projectcluster.jbxprft.mongodb.net/?retryWrites=true&w=majority&appName=ProjectCluster";

// export const client = new MongoClient(Uri);

// export async function connectDB() {
//   try {
//     await client.connect();
//     console.log("✅ Connected to MongoDB (Compass/Local)");
//   } catch (err) {
//     console.error("❌ Database connection failed:", err.message);
//     process.exit(1);
//   }
// }

import { MongoClient, ServerApiVersion } from "mongodb";
// const uri ="mongodb+srv://ABM:newUser1@projectcluster.jbxprft.mongodb.net/?appName=ProjectCluster";
const uri = "mongodb://localhost:27017/OlxClone"
export const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
