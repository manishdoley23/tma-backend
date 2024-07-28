import express from "express";
import cors from "cors";

import user from "./routes/user";
import connectDB from "./db";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api", user);

connectDB().then(() => {
  app.listen(process.env.PORT || 8080, () => {
    console.log("Express server on PORT " + process.env.PORT);
  });
});
