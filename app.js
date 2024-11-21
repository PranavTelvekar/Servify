require("dotenv").config();


//console.log(process.env.MONGO_URL)

const express=require("express");
const app=express();

let port=8080;
app.listen(port,()=>{
    console.log(`Server Is Started On Port ${port}`);
})



//---------------------------------------------------------------------------------------

const User=require("./models/user");
const ServiceProvider=require("./models/serviceProvider");
const Review=require("./models/review")

//----------------------------------------------------------------------------------------

//Connecting Database

// getting-started.js
const mongoose = require('mongoose');

main().then((res)=>{
    console.log("MongoDB Is Also Connected")
})
.catch(err => console.log(err));

async function main() {
  await mongoose.connect(`${process.env.MONGO_URL}`);
  //await mongoose.connect('mongodb://127.0.0.1:27017/test');

  // use `await mongoose.connect('mongodb://user:password@127.0.0.1:27017/test');` if your database has auth enabled
}

//--------------------------+--------------------------------------------------------------

const path=require("path");

app.set("view engine","ejs");


app.set("views",path.join(__dirname,"views"));

app.use(express.urlencoded({extended:true}));

//----------------------------------------------------------------------------------------
const methodOverride=require("method-override");

app.use(methodOverride("_method"));

const ExpressError=require("./utils/ExpressError");
//----------------------------------------------------------------------------------------

const session=require("express-session");
const sessionOption={
    secret:"mysupersecret",
    resave:false,
    saveUninitialized:true,
    cookie:{
        expires:Date.now()+7*24*60*60*1000,
        maxAge:7*24*60*60*1000,
        httpOnly:true
    }
};
const flash=require("connect-flash");
app.use(session(sessionOption));
app.use(flash());

const passport=require("passport");
const localStrategy=require("passport-local");
app.use(passport.initialize());
app.use(passport.session());



const ensureRole=require("./middlewares/middleware")



//---------------------------------------------------------------------------------------


passport.use("user-local",new localStrategy(User.authenticate()));
passport.use("local-service",new localStrategy(ServiceProvider.authenticate()));

passport.serializeUser((user,done)=>{
    done(null,{id:user._id,type:user.constructor.modelName})
})
passport.deserializeUser(async(obj,done)=>{
    try{
        const model=obj.type==='User'?User:ServiceProvider;
        const user=await model.findById(obj.id);
        done(null,user)
    }catch(err){
        done(err,null);
    }
    
})

//--------------------------------------------------------------------------------------


app.use((req,res,next)=>{
    res.locals.success=req.flash("success");
    res.locals.error=req.flash("error");
    res.locals.currentUser=req.user;
    next();
})


app.get("/logout",(req,res,next)=>{
    req.logout((err)=>{
        if(err){
            return next(err);
        }
        req.flash("success","You Are Logged out");
        res.redirect("/");
    })
})



//----------------------------------------------------------------------------------------

const userRouter=require("./routes/user");
app.use("/user",userRouter);

//----------------------------------------------------------------------------------------
const servicesRouter=require("./routes/services");
app.use("/services",servicesRouter);

//----------------------------------------------------------------------------------------
const slotsRouter=require("./routes/slots");
app.use("/slot",slotsRouter);

//----------------------------------------------------------------------------------------

const reviewsRouter=require("./routes/reviews");
app.use("/review",reviewsRouter);

//----------------------------------------------------------------------------------------

const bookingRouter=require("./routes/booking");
const wrapAsync = require("./utils/wrapAsync");
const Booking = require("./models/booking");
app.use("/booking",bookingRouter);

//----------------------------------------------------------------------------------------

const adminRouter=require("./routes/admin");
app.use("/admin",adminRouter);

//----------------------------------------------------------------------------------------



app.get("/",async(req,res)=>{
    res.render("landing.ejs");
})









app.get("/mapbox",ensureRole("User"), wrapAsync(async (req, res) => {
    const serviceProviders = await ServiceProvider.find({}).select('geometry _id');  // Fetching providers with only necessary fields
    res.render("map/map.ejs", { serviceProviders });
}));



//Payment

const Razorpay = require('razorpay');

const instance = new Razorpay({
    key_id: `${process.env.RAZORPAY_ID_KEY}`,
    key_secret: `${process.env.RAZORPAY_SECRET_KEY}`,
});

app.get("/user/:bid/payment",async(req,res)=>{
    let {bid}=req.params
    const booking=await Booking.findById(bid).populate("user").populate({path:"slot",populate:"serviceProvider"});
    console.log(booking);
    const bookingUser=booking.user;
    const bookingServiceProvider=booking.serviceProviders;
    const slot=booking.slot;
    const amount=slot.price;
    const options = {
        amount: amount * 100, // Convert to paisa
        currency: "INR",
        receipt: "order_rcptid_11",
    };
    instance.orders.create(options, (err, order) => {
        if (err) {
            return res.status(500).json({ success: false, msg: "Error in creating order" });
        }

        // Render a new view for payment
        res.render('payment/payment.ejs', {
            key_id: process.env.RAZORPAY_KEY_ID,  // Razorpay Key ID from environment
            amount: order.amount,
            order_id: order.id,
            slot_id:slot._id,
            description: booking.description,
            booking
        });
    });
    // res.render("payment/payment.ejs",{slot});
})  

app.get('/paymentSuccess/:bid', async(req, res) => {
    let {bid}=req.params;
    const booking=await Booking.findById(bid);
    booking.payment='Done';
    booking.save();
    req.flash("success","Payment Was Successful");
    res.redirect(`/user/${req.user._id}/bookings`);
});

app.get('/paymentFailure', (req, res) => {
    req.flash("error","Payment Was Unsuccessful");
    res.redirect(`/user/${req.user._id}/bookings`);
});

//---------------Error Handling ---------------------------------------------------------//

// app.use("*",(req,res,next)=>{
//     next(new ExpressError(404,"Page Not Exists"));
// })
app.use((err,req,res,next)=>{
    let {statusCode,message}=err;
    console.log(err);
    res.render("ErrorHandling/error.ejs",{message});
})