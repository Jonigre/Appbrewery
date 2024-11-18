//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const bcrypt = require('bcrypt');
const saltRounds = 10;


const app = express();

app.use(express.static("public"));

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({extended: true}));



mongoose.connect("mongodb://localhost:27017/userDB")
.then(() => console.log("Connected to MongoDB"))
.catch((error) => console.error("Connection error", error));


const userSchema =  new mongoose.Schema({
    email: String,
    password: String
});


const User = new mongoose.model("User" , userSchema);


app.get("/", function (req, res){
    res.render("home");
});

app.get("/login", function (req, res){
    res.render("login");
});

app.get("/register", function (req, res){
    res.render("register");
});



//User registration
app.post("/register", async function(req, res) {
    try {
        // Hash the password
        const hash = await bcrypt.hash(req.body.password, saltRounds);

        // Create a new user
        const newUser = new User({
            email: req.body.username,
            password: hash
        });

        // Save the user and respond
        await newUser.save();
        res.render("secrets");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error registering user. Please try again.");
    }
});


//User login
app.post("/login", async function(req, res) {
    const { username, password } = req.body;

    try {
        // Find the user in the database
        const foundUser = await User.findOne({ email: username });

        // Check if the user exists
        if (!foundUser) {
            console.log("User not found.");
            return res.status(401).send("Invalid email or password.");
        }

        // Compare the provided password with the hashed password
        const match = await bcrypt.compare(password, foundUser.password);

        if (match) {
            // Password matches; render the secrets page
            res.render("secrets");
        } else {
            console.log("Incorrect password.");
            res.status(401).send("Invalid email or password.");
        }
    } catch (err) {
        console.error(err);
        res.status(500).send("An error occurred while logging in.");
    }
});




app.listen(3000, function(){
    console.log("Server is running on port 3000");
});