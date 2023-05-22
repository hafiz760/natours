const express = require('express');
const userController = require('./../controllers/userController');
const authController = require('./../controllers/authController');

const router = express.Router();
router.post('/signup',authController.signup)
router.post('/login',authController.login)
router.post('/forgotpassword',authController.forgotpassword)
router.patch('/resetPassword/:otp',authController.resetPassword)

router.use(authController.protect)
router.patch('/updatePassword',authController.updatePassword)
router.patch('/updateMe',userController.updateMe)
router.delete('/deleteMe',userController.deleteMe)
router.get('/getMe',userController.getMe,userController.getUser)

router.use(authController.restrictTo('admin'))

router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);



module.exports = router;
