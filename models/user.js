const mongoose=require("mongoose");
const passportLocalMongoose=require("passport-local-mongoose");

const userSchema=new mongoose.Schema({
    email: { 
        type: String, 
        required: true, 
        unique: true 
    },
    contactNumber: { 
        type: String, 
        required: true 
    },
    address: {
        street: {
            type:String
        },
        city: {
            type:String,
            require:true
        },
        state: {
            type:String,
            required:true
        },
    },
    bookings: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Booking' 
    }],
    reviews: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Review' 
    }],
    geometry:{
        type: {
          type: String, // Don't do `{ location: { type: String } }`
          enum: ['Point'], // 'location.type' must be 'Point'
          //required: true
        },
        coordinates: {
          type: [Number],
          //required: true
        }
    }
});


userSchema.plugin(passportLocalMongoose);

const User=mongoose.model("User",userSchema);
module.exports=User;