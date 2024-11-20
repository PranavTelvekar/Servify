const { ref } = require("joi");
const mongoose=require("mongoose");
const passportLocalMongoose=require("passport-local-mongoose");

const slotSchema = new mongoose.Schema({
    slot:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"Slot"
    }
});

const SlotHistory=mongoose.model("SlotHistory",slotSchema)

module.exports=SlotHistory;