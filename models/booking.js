const { type } = require("express/lib/response");
const { required } = require("joi");
const mongoose=require("mongoose");

const BookingSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', required: true 
    },
    // serviceProvider: { 
    //     type: mongoose.Schema.Types.ObjectId, 
    //     ref: 'ServiceProvider', required: true 
    // },
    slot: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Slot', required: true 
    },
    problemDescription: { 
        type: String, 
        required: true 
    }, // details about the user's problem
    bookingDate: { 
        type: Date, 
        default: Date.now 
    },
    status: { 
        type: String, 
        enum: ['Pending', 'Confirm', 'Cancel'], 
        default: 'Pending' 
    },
    cancelBefore:{
        type:Date,
    }
});

const Booking=mongoose.model("Booking",BookingSchema);

module.exports=Booking;