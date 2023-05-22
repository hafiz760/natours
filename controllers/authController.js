const {promisify} = require('util')
const User = require('./../models/userModel');
const AppError = require('./../utils/appError');
const catchAsync = require('./../utils/catchAsync');
const sendEmail = require('../utils/email');
const bcrypt = require('bcrypt')
const cookie = require('cookie')

const jwt = require('jsonwebtoken')
const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });
const signToken = id =>{
 return jwt.sign(
    {id}, 
    process.env.JWT_SECRET,
    {expiresIn:process.env.JWT_EXPRISE_IN}
    )
}

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};
exports.signup =catchAsync( async (req,res)=>{
        const user =await User.create({
          name:req.body.name,
          email:req.body.email,
          password:req.body.password,
          passwordConfirm:req.body.passwordConfirm,
          passwordChangedAt:req.body.passwordChangedAt
        })
        createSendToken(user,201,res)
 }
)
exports.login = catchAsync(async (req,res,next)=>{
    const {email,password} = req.body
    if(!(email,password)){
     return next(new AppError('please provide email and password !', 400 ))
    }
    const user = await User.findOne({email}).select('+password')
    if(!user || !await user.correctPassword(password,user.password)){
      return next(new AppError('Incorrect email or password!', 401))
    }
    createSendToken(user,200,res)
}  
)
exports.protect = catchAsync( async(req,res,next)=>{
  let token 
  if(req.headers.authorization && req.headers.authorization.startsWith('Beare')){
    token = req.headers.authorization.split(' ')[1]
  }
if(!token){
return next(new AppError('you are not logeed in! please login again', 401 )) 
}
const decode = await promisify(jwt.verify)(token,process.env.JWT_SECRET);
const currentUser = await User.findById(decode.id)
if(!currentUser){
  return next(new AppError('The user dose not exist in this token', 401 )) 
}
if(currentUser.changedPasswordAfter(decode.iat)){
  return next(new AppError('Password recently change so please login again for new TOKEN', 401 )) 
}
req.user = currentUser;
next()
})
exports.forgotpassword = catchAsync(async (req,res,next)=>{
const user = await User.findOne({email:req.body.email})
if(!user){
  return next(new AppError('No user have with this email', 404 )) 
}
const ResetOtp = await  user.createPasswordResetOtp()
await user.save({validateBeforeSave:false});
const message = `forgot your password submit a PATCH request with your Password and confirmPassword
to ${ResetOtp}.\n If you did't forget your password , Please ignore this email`
try{
  await sendEmail({
    email:user.email,
    subject:'Your Password reset otp (valid for 10 mint)',
    message
  })
  res.status(200).json({
    status: 'success',
    message:'ResetPassword OTP send into email'
  });
}catch(err){
  user.createPasswordResetOtp = undefined;
  user.passwordResetExpires - undefined;
  await user.save({validateBeforeSave:false});
  return(new AppError('somting wrong to send email ',500))
}



})
exports.resetPassword =catchAsync( async (req,res,next)=>{
   const { otp } = req.params;
    const user = await User.findOne({ 
      passwordResetotp: otp , 
      passwordResetExpires:{$gt:Date.now()}
    });
    if(!user){
      return next(new AppError('OTP is invalid and expire', 400 )) 
    }
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetotp = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
   const  message ='Your Password Chaged succssfully';
    createSendToken(user,200,res,message)

  });
exports.updatePassword = catchAsync( async (req,res,next)=>{
    const user = await User.findById(req.user.id).select('+password');
    if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
      return next(new AppError('Your current password is wrong.', 401));
    }
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();
    createSendToken(user, 200, res);
  }

  )
  exports.restrictTo = (...roles) => {
    return (req, res, next) => {
      // roles ['admin', 'lead-guide']. role='user'
      if (!roles.includes(req.user.role)) {
        return next(
          new AppError('You do not have permission to perform this action', 403)
        );
      }
  
      next();
    };
  };

  