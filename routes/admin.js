const express = require("express");
const router = express.Router({ mergeParams: true });
const ServiceProvider = require("../models/serviceProvider");

router.get("/",async(req,res)=>{
    const services=await ServiceProvider.find().populate({
        path: "slots",
        populate: { path: "booking", populate: "user" }
    })
    .populate({
        path: "reviews",
        model: "Review",
        populate: "user"
    })
    .populate({
        path: "slotHistory",
        populate: { path: "booking", populate: "user" }
    });
    const painters=services.filter(service=>service.serviceCategory=="Painter");
    const plumbers=services.filter(service=>service.serviceCategory=="Plumber");
    const electricians=services.filter(service=>service.serviceCategory=="Electrician");
    const nursingHomes=services.filter(service=>service.serviceCategory=="Nursing Home");
    const beauty=services.filter(service=>service.serviceCategory=="Beauty");
    res.render("admin/AdminDashboard.ejs",{services,painters,plumbers,electricians,nursingHomes,beauty});
})


router.get("/:id",async(req,res)=>{
    let {id}=req.params
    const provider=await ServiceProvider.findById(id).populate({
        path: "slots",
        populate: { path: "booking", populate: "user" }
    })
    .populate({
        path: "reviews",
        model: "Review",
        populate: "user"
    })
    .populate({
        path: "slotHistory",
        populate: { path: "booking", populate: "user" }
    });

    const review=provider.reviews;
    let reviewLength=review.length;
    let totalReview=0;
    for(r of review){
        totalReview=totalReview+r.rating;
    }
    let AverageReview=totalReview/reviewLength;
    
    let slots=provider.slots;
    let numberOfSlots=slots.length;
    let numberOfBookings=0;
    for(s of slots){
        numberOfBookings=numberOfBookings+s.numberOfBookings;
    }
    // console.log(numberOfBookings);
    // console.log(slots)

    let totalPrice=0;

    for(s of slots){
        totalPrice=totalPrice+s.price
    }

    let averagePrice=totalPrice/slots.length;

    console.log(averagePrice);

    res.render("admin/ProviderDetails",{AverageReview,averagePrice,numberOfSlots,numberOfBookings});

})


module.exports=router;