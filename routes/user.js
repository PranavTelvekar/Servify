const express=require("express");
const router=express.Router({mergeParams:true});
const passport=require("passport");
const User=require("../models/user");
const ServiceProvider=require("../models/serviceProvider");
const Booking=require("../models/booking")
const wrapAsync=require("../utils/wrapAsync");
const ensureRole=require("../middlewares/middleware");

const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding')
const mapToken=process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });

router.get("/signup",(req,res)=>{
    res.render("user/signup.ejs");
})

router.post("/signup",wrapAsync(async(req,res)=>{
    console.log(req.body);
    let {username,email,password,contactNumber,address}=req.body;
    // Geocoding
    let response = await geocodingClient.forwardGeocode({
        query: `${address.street},${address.city}`,
        limit: 1
    }).send();

    if (!response.body.features.length) {
        req.flash("error", "Invalid location. Please check the city and state.");
        return res.redirect("back");
    }
    let newUser=new User({username,email,contactNumber,address,geometry:response.body.features[0].geometry});
    console.log(response.body.features[0].geometry);
    let registeredUser=await User.register(newUser,password);
    //console.log(registeredUser);
    res.locals.currentUser=req.user;
    // Log the user in after successful signup
    req.login(registeredUser, (err) => {
        if (err) {
            return next(err);  // Always pass errors to the next middleware.
        }
        req.flash("success", "You have successfully signed up. Welcome!");
        res.redirect(`/user`);
    });
}))

router.get("/login",(req,res)=>{
    let redirectTo=req.session.returnTo;
    if(redirectTo){
        res.render("user/login.ejs",{redirectTo});
    }else{
        redirectTo="/user";
        res.render("user/login.ejs",{redirectTo});
    }
    
})

router.post("/login",passport.authenticate("user-local", { failureRedirect: "login",failureFlash:true }),(req,res)=>{
    res.locals.currentUser=req.user;
    const {redirectTo}=req.body;
    req.flash("success","You Are Logged In Successfuly");
    res.redirect(redirectTo);
})



// router.get("/filter",wrapAsync(async(req,res)=>{
//     const providers=await ServiceProvider.find();
//     res.render("user/filter.ejs",{providers});
// }))

router.get("/",ensureRole("User"),wrapAsync(async(req,res)=>{
    const allServiceProviders=await ServiceProvider.find();
    const services=await ServiceProvider.find();
    res.render("userside/index.ejs",{services,allServiceProviders});
}))


router.post("/filter", wrapAsync(async (req, res) => {
    const allServiceProviders=await ServiceProvider.find();
    let { serviceCategory, state, city, price } = req.body;
    console.log(req.body);
    serviceArea= {
        state: state,
        city: city
    }
    const providers = await ServiceProvider.find({serviceCategory}).populate("slots");

    
    const filteredProviders = providers.filter(provider => 
        provider.slots.some(slot => slot.price <= price)
    );
    const services = filteredProviders.filter(provider => 
        provider.serviceArea.city === city && provider.serviceArea.state === state
    );
    req.flash("success","These Are The Service Proveders After Filtering");
    res.render("userside/index.ejs",{services,allServiceProviders});
}));




router.get("/:id/bookings",ensureRole("User"),wrapAsync(async(req,res)=>{
    let {id}=req.params;
    const user=await User.findById(id).populate({path:"bookings",populate:{path:"slot",populate:"serviceProvider"}});

    const bookings=user.bookings;
    const allServiceProviders=await ServiceProvider.find();
    res.render("userside/seeBookings",{bookings,allServiceProviders});
}));


router.post("/:id/filteByStatus",wrapAsync(async(req,res)=>{
    let {id}=req.params;
    let {bookingStatus}=req.body;
    const user=await User.findById(id).populate({path:"bookings",populate:{path:"slot",populate:"serviceProvider"}});
    let bookings=user.bookings;
    const filteredBookings = bookings.filter(booking => booking.status === bookingStatus);
    // Render filtered bookings
    const allServiceProviders = await ServiceProvider.find();
    res.render("userside/seeBookings", { bookings: filteredBookings, allServiceProviders });
    //res.render("userside/seeBookings",{bookings,allServiceProviders});
}))



router.post("/:id/filteBySlotPrice",wrapAsync(async(req,res)=>{
    let {id}=req.params;
    let {slotPrice}=req.body;
    const user=await User.findById(id).populate({path:"bookings",populate:{path:"slot",populate:"serviceProvider"}});
    let bookings=user.bookings;
    const filteredBookings = bookings.filter(booking => booking.slot.price<=slotPrice);
    // Render filtered bookings
    const allServiceProviders = await ServiceProvider.find();
    res.render("userside/seeBookings", { bookings: filteredBookings, allServiceProviders });
    //res.render("userside/seeBookings",{bookings,allServiceProviders});
}))


router.get("/:bid/bookingCancel",ensureRole("User"),wrapAsync(async(req,res)=>{
    let {bid}=req.params;
    let booking=await Booking.findById(bid);
    if(booking.cancelBefore.getTime()<Date.now()){
        req.flash("error","You Cannot Cancel This Booking Now");
        return res.redirect(`/user/${req.user._id}/bookings`);
    }
    booking.status="Cancel";
    booking.save();
    res.redirect(`user/${req.user._id}/bookings`);
}))


module.exports=router;