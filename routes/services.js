const express = require("express");
const app=express();
const router = express.Router({ mergeParams: true });
const ServiceProvider = require("../models/serviceProvider");
const wrapAsync = require("../utils/wrapAsync");
const passport = require("passport");
const cloudinary=require("cloudinary").v2;
const fileUpload=require("express-fileupload");

const SlotHistory=require("../models/slotHistory");

const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding')
const mapToken=process.env.MAP_TOKEN;

const geocodingClient = mbxGeocoding({ accessToken: mapToken });
// stylesService exposes listStyles(), createStyle(), getStyle(), etc.

app.use(fileUpload());
// Configure Cloudinary

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET
});

// Index route - Shows all services
// router.get("/", wrapAsync(async (req, res) => {
//     let services = await ServiceProvider.find();  // This assumes your ServiceProvider model is working.
//     res.render("services/index.ejs", { services });
// }));

// Signup routes
router.get("/signup", wrapAsync(async (req, res) => {
    res.render("services/signup.ejs");
}));


// Post route for signup
router.post("/signup", fileUpload({ useTempFiles: true, tempFileDir: '/tmp/' }), wrapAsync(async (req, res, next) => {
    // Extracting form data
    const { username, email, password, contactNumber, serviceCategory, adharCardNumber, experience, LicineNumber, workDescription } = req.body;

    const serviceArea = {
        city: req.body['serviceArea[city]'],
        state: req.body['serviceArea[state]']
    };

    // Check if file is uploaded
    const file = req.files ? req.files.profileImage : null;
    if (!file) {
        req.flash("error", "Please upload a profile image.");
        return res.redirect("back");
    }

    // Limit file size (e.g., 5MB)
    if (file.size > 5 * 1024 * 1024) {
        req.flash("error", "File size exceeds the 5MB limit.");
        return res.redirect("back");
    }

    // Geocoding
    let response;
    try {
        response = await geocodingClient.forwardGeocode({
            query: `${serviceArea.city},${serviceArea.state}`,
            limit: 1
        }).send();
    } catch (err) {
        console.error("Geocoding Error: ", err);
        req.flash("error", "Location lookup failed. Please try again.");
        return res.redirect("back");
    }

    if (!response.body.features.length) {
        req.flash("error", "Invalid location. Please check the city and state.");
        return res.redirect("back");
    }

    // Upload to Cloudinary
    let result;
    try {
        result = await cloudinary.uploader.upload(file.tempFilePath, {
            folder: 'Mini_Project',
            use_filename: true,
            unique_filename: false
        });
    } catch (err) {
        console.error("Cloudinary Upload Error: ", err);
        req.flash("error", "File upload failed. Please try again.");
        return res.redirect("back");
    }

    // Create new service provider
    let newServiceProvider = new ServiceProvider({
        username,
        email,
        contactNumber,
        serviceCategory,
        adharCardNumber,
        experience,
        LicineNumber,
        serviceArea,
        workDescription,
        profileImage: result.secure_url,
        geometry: response.body.features[0].geometry
    });

    // Register service provider
    try {
        const registeredServiceProvider = await ServiceProvider.register(newServiceProvider, password);
        req.login(registeredServiceProvider, (err) => {
            if (err) return next(err);
            req.flash("success", "You have successfully signed up. Welcome!");
            res.redirect(`/services/${registeredServiceProvider._id}`);
        });
    } catch (err) {
        console.error("Registration Error: ", err);
        req.flash("error", "Registration failed. Please try again.");
        res.redirect("back");
    }
}));


// Login routes
router.get("/login", (req, res) => {
    const redirectTo = req.session.returnTo;
    res.render("services/login.ejs", { redirectTo });
    
});

// Ensure passport strategy name is correct
router.post("/login", passport.authenticate("local-service", { 
    failureRedirect: "/services/login",  // Ensure the path is correct here.
    failureFlash: true 
}), (req, res) => {
    //const { redirectTo } = req.body;
    const user=req.user;
    req.flash("success", "Logged in successfully!");
    res.redirect(`/services/${user._id}`);
});

// Show profile route - Displays individual provider profiles
router.get("/:id", wrapAsync(async (req, res) => {
    let { id } = req.params;

    let provider = await ServiceProvider.findById(id)
        .populate({
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
    const expiredSlotIds = provider.slots
        .filter(slot => slot.date.getTime() < Date.now()) // Find expired slots
        .map(slot => slot._id); // Extract their IDs
      
    if (expiredSlotIds.length > 0) {
        // Insert expired slots into SlotHistory
        await SlotHistory.insertMany(expiredSlotIds.map(id => ({ slot: id })));

        // Push expired slots into the slotHistory array of the provider (use $addToSet to avoid duplicates)
        await ServiceProvider.findByIdAndUpdate(id, {
            $addToSet: { slotHistory: { $each: expiredSlotIds } } // Use $each to add multiple ObjectIds
        });

        // Remove the expired slots from the provider's slots array
        await ServiceProvider.findByIdAndUpdate(id, {
            $pull: { slots: { $in: expiredSlotIds } }
        });

    }
    provider=await ServiceProvider.findById(id).populate({
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
    res.render("services/profile.ejs", { provider });
}));

router.get("/booking/:pid", async (req, res) => {
    let { pid } = req.params;
    const provider = await ServiceProvider.findById(pid).populate({
        path: "bookings",
        model: "Booking",
        populate: "user"
    });
    const bookings = provider.bookings;
    res.render("booking/bookingForProvider.ejs", { bookings });
});

router.get("/slot/:pid",async(req,res)=>{
    let {pid}=req.params;
    const provider=await ServiceProvider.findById(pid).populate({path: "slotHistory",populate: { path: "booking", populate: "user" }});
    //const slots=provider.slotHistory;
    res.render("services/SlotHistory.ejs",{provider});
})


module.exports = router;
