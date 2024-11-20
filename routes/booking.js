const express = require("express");
const router = express.Router({ mergeParams: true });
const Booking=require("../models/booking");
const Slot = require("../models/slot");
const ServiceProvider = require("../models/serviceProvider");
const passport = require("passport");
const localStrategy = require("passport-local");
const User=require("../models/user");
const ensureRole=require("../middlewares/middleware");
const wrapAsync = require("../utils/wrapAsync");

router.get("/:sid",ensureRole("User"),(req,res)=>{
    let {sid}=req.params;
    res.render("booking/bookingForm.ejs",{sid});
})

router.post("/:sid",ensureRole("User"),wrapAsync(async(req,res)=>{
    let {problemDescription}=req.body;
    let {sid}=req.params;
    const slotBooking=await Slot.findById(sid).populate("booking");
    let a=slotBooking.numberOfBookings;
    a=a+1;
    const serviceProvider=await ServiceProvider.findById(slotBooking.serviceProvider);
   

    for (const book of slotBooking.booking) 
    {
        if (book.user.equals(req.user._id)) 
        {
            req.flash("error", "You already booked this slot");
            return res.redirect(`/services/${serviceProvider.id}`);
        }
    }

    const user=req.user;
    let booking=new Booking({user:user._id,slot:sid,problemDescription:problemDescription});
    let slotBookingEdit=await Slot.findByIdAndUpdate(sid,{$push:{booking:booking.id},numberOfBookings:a,});
    let userBooking=await User.findByIdAndUpdate(user._id,{$push:{bookings:booking._id}});
    currentDate=Date.now();
    currentDate=new Date(currentDate);
    currentDate.setMinutes(currentDate.getMinutes()+1);
    let cancelBefore=currentDate;

    booking.cancelBefore=cancelBefore;
    booking.save();
    req.flash("success","Slot Is Booked Succesfully");
    res.redirect(`/user/${user._id}/bookings`);
}))

router.post("/:pid/:bid/confirm",ensureRole("ServiceProvider"),wrapAsync(async(req,res)=>{
    let {pid,bid}=req.params;
    const booking=await Booking.findByIdAndUpdate(bid,{status:"Confirm"});
    const slotId=booking.slot;
    const slot=await Slot.findById(slotId).populate("booking");
    slot.booking.forEach(element => {
        if(element._id!=bid){
            const changeBookingStatus=Booking.findByIdAndUpdate(element._id,{status:"Cancel"});
        }
    });
    res.redirect(`/services/${pid}`)
}))
router.post("/:pid/:bid/cancel",ensureRole("ServiceProvider"),wrapAsync(async(req,res)=>{
    let {pid,bid}=req.params;
    const booking=await Booking.findByIdAndUpdate(bid,{status:"Cancel"});
    res.redirect(`/services/${pid}`);
}))
module.exports=router;