//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(session({
    secret: "Thisisourlittlesecret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB")
.then(() => console.log("Connected to MongoDB"))
.catch((error) => console.error("Connection error", error));


const userSchema =  new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secrets: [String]
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User" , userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    console.log("Serializing user:", user); // Debugging
    done(null, user.id);
});

passport.deserializeUser(async function(id, done) {
    console.log("Deserializing user with ID:", id); // Debugging
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});



passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    //userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"

  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));




app.get("/", function (req, res){
    res.render("home");
});

app.get("/auth/google",
    passport.authenticate("google", {scope : ["profile"]})
);

app.get("/auth/google/secrets", 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect("/secrets");
  });

app.get("/login", function (req, res){
    res.render("login");
});

app.get("/register", function (req, res){
    res.render("register");
});

app.get("/secrets" , async function(req, res){
    try {
        const foundUsers = await User.find({"secrets": {$exists: true}});
        if (foundUsers) {
            res.render("secrets", {usersWithSecret: foundUsers});
        }
    } catch (err) {
        console.error(err);
    }
});

app.get("/submit" , function(req, res){
    if (req.isAuthenticated()){
        res.render("submit");
    } else {
        res.redirect("/login");
    }
});

app.post("/submit", async function (req, res) {
    const submittedSecret = req.body.secret;

    if (!req.user) {
        return res.status(401).send("User not authenticated.");
    }

    try {
        
        // Find the user by ID
        const foundUser = await User.findById(req.user.id);

        if (foundUser) {
            // Add the secret to the user
            foundUser.secrets.push(submittedSecret);

            // Save the updated user
            await foundUser.save();

            // Redirect to secrets page
            res.redirect("/secrets");
        } else {
            res.status(404).send("User not found");
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("An error occurred while submitting the secret");
    }
});


app.get("/logout", function(req, res, next) {
    req.logout(function(err) {
        if (err) {
            console.error(err);
            return next(err); // Pass the error to Express for handling
        } else {
            res.redirect("/"); // Redirect to the homepage or login page after successful logout
        }
    });
});




//User registration
app.post("/register", function(req, res) {
    
    User.register({username: req.body.username}, req.body.password, function(err, user){
        if (err){
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            });
        }
    });
});


//User login
app.post("/login", function(req, res) {
   
    const user = new User ({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function(err){
        if (err){
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            });
        }
            
});

});




app.listen(3000, function(){
    console.log("Server is running on port 3000");
});