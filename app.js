//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");

const app = express();

app.use(express.static("public"));

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({extended: true}));



mongoose.connect("mongodb://localhost:27017/userDB")
.then(() => console.log("Connected to MongoDB"))
.catch((error) => console.error("Connection error", error));


const userSchema = {
    email: String,
    password: String
};

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
app.post("/register" , async function(req, res){
    const newUser = new User({
        email: req.body.username,
        password: req.body.password
    });

   try {
    await newUser.save();
    res.render("secrets")
   } catch (err) {
    console.error(err);
    res.status(500).send("Error registering user.");
   }

});

//User login
app.post("/login" , async function(req, res){
    const username = req.body.username;
    const password = req.body.password;

    try {
        const foundUser = await User.findOne({ email: username });

        if (!foundUser) {
            console.log("User not found.");
            res.status(401).send("Invalid email or password.");
            return;
        }

        if (foundUser.password === password) {
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