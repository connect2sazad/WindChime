import express from 'express';import identityAuth from '../middlewares/identity-auth.middleware.js';import serviceAuth from '../middlewares/service-auth.middleware.js';import Controller from '../controllers/notification.controller.js';const router=express.Router();
router.post('/internal/events',serviceAuth,(req,res,next)=>Controller.ingest(req,res,next));
router.get('/notifications/unread-count',identityAuth,(req,res,next)=>Controller.unread(req,res,next));
router.patch('/notifications/read-all',identityAuth,(req,res,next)=>Controller.readAll(req,res,next));
router.get('/notifications',identityAuth,(req,res,next)=>Controller.list(req,res,next));
router.patch('/notifications/:id/read',identityAuth,(req,res,next)=>Controller.read(req,res,next));export default router;
