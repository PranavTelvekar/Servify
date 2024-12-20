// function serviceProviderLogin(req, res, next) {
//     if(!req.isAuthenticated()){
//         return res.redirect("/services/login");
//     }
//     next();
// }


// module.exports=serviceProviderLogin;

const express=require("express");
const app=express();
const ensureRole=(role)=>(req,res,next)=>{
    if(req.isAuthenticated()&&req.user.constructor.modelName===role){
        return next();
    }
    req.session.returnTo = req.originalUrl;
    if(role==="ServiceProvider"){
        res.redirect("/services/login");
    }else{
        res.redirect("/user/login");
    }
}


module.exports=ensureRole;