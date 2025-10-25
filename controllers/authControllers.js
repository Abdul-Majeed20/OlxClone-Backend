import express, { response } from "express";
import { client } from "../dbConfig.js";
const db = client.db("OlxClone");
const Users = db.collection("Users");
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";

export const register = async (req, res) => {
  if (
    !req.body.firstName ||
    !req.body.lastName ||
    !req.body.email ||
    !req.body.phone ||
    !req.body.password ||
    !req.body.city
  ) {
    res.send("please fill out complete form");
  } else {
    let email = req.body.email.toLowerCase();
    let password = req.body.password;
    const emailFormat =
      /^[a-zA-Z0-9_.+]+(?<!^[0-9]*)@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
    const passwordValidation =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/;
    if (email.match(emailFormat) && password.match(passwordValidation)) {
      const checkUser = await Users.findOne({ email });
      console.log("User checked", checkUser);
      if (checkUser) {
        res.status(201).send({
          status: 1,
          message: "Email Already Exists",
        });
      } else {
        const hashedPass = await bcrypt.hashSync(password);
        const user = {
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          email: email,
          city: req.body.city,
          phone: req.body.phone,
          password: hashedPass,
          role : 'user',
          joinedAt : new Date()
        };

        const response = await Users.insertOne(user);
        if (response) {
          res.status(200).send({
            status: 1,
            success: "User Registered Successfully",
          });
          // res.render("/login")
        }
      }
    } else {
      res.status(404).send({
        status: 0,
        message: "Invalid Email Or password",
      });
    }
  }
};

export const login = async (req, res) => {
  try {
    if (!req.body.email || !req.body.password) {
      return res.send({
        status: 0,
        message: "Email or Password is required",
      });
    }
    const email = req.body.email.toLowerCase();
    const emailFormat =
      /^[a-zA-Z0-9_.+]+(?<!^[0-9]*)@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
    if (!email.match(emailFormat)) {
      return res.send({
        status: 0,
        message: "Enter valid Email address",
      });
    }
    const user = await Users.findOne({ email });
    if (!user) {
      return res.status(404).send({
        status: 0,
        message: "Email is not registered",
      });
    }

    const matchPassword = await bcrypt.compareSync(
      req.body.password,
      user.password
    );
    if (!matchPassword) {
      return res.send({
        status: 0,
        message: "Email or Password is incorrect",
      });
    }
    const token = await jwt.sign(
      {
        _id: user._id,
        role: user.role,
        email,
        firstName: user.firstName,
      },
      process.env.SECRET_KEY,
      { expiresIn: "1h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
    });

    res.status(200).send({
      status: 1,
      success: true,
      data: {
        firstName: user.firstName,
        email: user.email,
        role : user.role
      },
      message : "Login Successfully"
    });
  } catch (error) {
    return res.send({
      status: 0,
      error: error,
      message: "Something Went Wrong",
    });
  }
};

export const logout = (req, res) => {
  try {
    // Clear the token cookie by setting it to empty and immediate expiration
    res.cookie("token", "", {
      httpOnly: true,
      secure: true,
      expires: new Date(0), // Set expiration to past date to immediately expire
      sameSite: "strict",
    });

    // Alternative method - you can also use clearCookie
    // res.clearCookie("token", {
    //   httpOnly: true,
    //   secure: true,
    //   sameSite: "strict"
    // });

    res.status(200).send({
      status: 1,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).send({
      status: 0,
      message: "Something went wrong during logout",
      error: error.message,
    });
  }
};

