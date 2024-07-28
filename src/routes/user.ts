import { Router } from "express";
import { User } from "../schema/user-schema";
import mongoose from "mongoose";

const router = Router();

const generateAccessAndRefreshTokens = async (
  userId: mongoose.Types.ObjectId
): Promise<{ accessToken: string; refreshToken: string } | undefined> => {
  try {
    const user = await User.findById(userId);

    if (!user) {
      console.log("User not found");
      return undefined;
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // attach refresh token to the user document to avoid refreshing the access token with multiple refresh tokens
    user.refreshToken = refreshToken;

    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    console.log("error:", error);
    throw new Error("Something went wrong while generating the access token");
  }
};

router.post("/auth/signup", async (req, res) => {
  const { email, name, password } = req.body;

  const existedUser = await User.findOne({ email });

  if (existedUser) {
    return res.status(409).json({ error: "User with email already exists" });
  }
  const user = await User.create({
    email,
    name,
    password,
  });

  const createdUser = await User.findById(user._id).select(
    "-refreshToken -password"
  );

  if (!createdUser) {
    return res
      .status(500)
      .json("Something went wrong while registering the user");
  }

  return res.status(201).json({ user: createdUser });
});

router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email) {
    return res.status(409).json({ error: "Email required" });
  }

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).json({ error: "User does not exist" });
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    return res.status(401).send("Invalid user credentials");
  }

  const tokenData = await generateAccessAndRefreshTokens(user._id);
  if (!tokenData) {
    return res.status(500).json({ error: "Failed to generate tokens" });
  }

  const { accessToken, refreshToken } = tokenData;

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json({ user: loggedInUser });
});

export default router;
