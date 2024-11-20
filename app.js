require("dotenv").config();


//console.log(process.env.MONGO_URL)

const express=require("express");
const app=express();

let port=8080;
app.listen(port,()=>{
    console.log(`Server Is Started On Port ${port}`);
})

const Razorpay = require('razorpay');

//---------------------------------------------------------------------------------------

const User=require("./models/user");
const ServiceProvider=require("./models/serviceProvider");
const Review=require("./models/review")

//----------------------------------------------------------------------------------------

//Connecting Database

// getting-started.js
const mongoose = require('mongoose');

main().catch(err => console.log(err));

async function main() {
  await mongoose.connect(`${process.env.MONGO_URL}`);

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

const instance = new Razorpay({
    key_id: 'rzp_live_0AHfGkDFyzMpPX',
    key_secret: '4kXfLxC4AlNs9sutQKYkyjv0',
});

app.get('/payment', (req, res) => {
    res.render("payment/payment.ejs"); // Serve the frontend page
});

app.post('/create-order', async (req, res) => {
    const { amount } = req.body; // Amount from frontend (in rupees)
    const options = {
      amount: amount * 100, // Convert to smallest currency unit (e.g., paise for INR)
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };
  
    try {
      const order = await Razorpay.orders.create(options);
      res.json(order);
    } catch (error) {
      console.error(error);
      res.status(500).send("Error creating order");
    }
  });

  app.post('/verify-payment', (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  
    const secret = 'YOUR_KEY_SECRET'; // Replace with your Razorpay secret key
    const crypto = require('crypto');
  
    const generatedSignature = crypto.createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
  
    if (generatedSignature === razorpay_signature) {
      res.json({ success: true, message: 'Payment verified successfully' });
    } else {
      res.json({ success: false, message: 'Payment verification failed' });
    }
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