import { Request, Response } from "express";
import cloudinary from "cloudinary";
import Restaurant from "../models/restaurant";
import mongoose from "mongoose";
import Order from "../models/order";

const getMyRestaurantOrder = async (req: Request, res: Response) => {
  try {
    const restaurant = await Restaurant.findOne({ user: req.userId });

    if (!restaurant) {
      return res.status(404).json({
        message: "User restaurant not found",
      });
    }

    const orders = await Order.find({ restaurant: restaurant._id })
      .populate("restaurant")
      .populate("user");

    if (!orders) {
      return res.status(404).json({
        message: "User restaurant orders not found",
      });
    }

    res.status(200).json(orders);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error while getting the user restaurant order",
    });
  }
};

const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    const restaurant = await Restaurant.findOne({ user: req.userId });

    // Check if the restaurant is belong to the user that want to make the change in the order
    if (restaurant?.user?._id.toString() !== req.userId) {
      return res.status(401).json({
        message: "User not authorized to update the order status",
      });
    }

    order.status = status;
    await order.save();

    res.status(200).json(order);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error occured while updating the user order status",
    });
  }
};

const getMyRestaurant = async (req: Request, res: Response) => {
  try {
    const restaurant = await Restaurant.findOne({ user: req.userId });

    if (!restaurant) {
      return res.status(404).json({
        message: "User restaurant not found",
      });
    }

    res.status(200).json(restaurant);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error while getting the user restaurant",
    });
  }
};

const createMyRestaurant = async (req: Request, res: Response) => {
  try {
    const existingRestaurant = await Restaurant.findOne({ user: req.userId });

    if (existingRestaurant) {
      return res.status(409).json({
        message: "User restaurant already exists",
      });
    }

    // const image = req.file as Express.Multer.File;
    // const base64Image = Buffer.from(image.buffer).toString("base64");
    // const dataURI = `data:${image.mimetype};base64,${base64Image}`;
    // const uploadedResponse = await cloudinary.v2.uploader.upload(dataURI);

    const imageUrl = await uploadFile(req.file as Express.Multer.File);

    const newRestaurant = new Restaurant(req.body);
    newRestaurant.imageUrl = imageUrl;
    newRestaurant.user = new mongoose.Types.ObjectId(req.userId);
    newRestaurant.lastUpdated = new Date();
    await newRestaurant.save();

    res.status(201).json(newRestaurant);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error while creating the user restaurant",
    });
  }
};

const updateMyRestaurant = async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const restaurant = await Restaurant.findOne({ user: req.userId });

    if (!restaurant) {
      return res.status(404).json({
        message: "User restaurant not found",
      });
    }

    // updates the fields
    restaurant.restaurantName = payload.restaurantName;
    restaurant.city = payload.city;
    restaurant.country = payload.country;
    restaurant.deliveryPrice = payload.deliveryPrice;
    restaurant.estimatedDeliveryTime = payload.estimatedDeliveryTime;
    restaurant.cuisines = payload.cuisines;
    restaurant.menuItems = payload.menuItems;
    restaurant.lastUpdated = new Date();

    if (req.file) {
      const imageUrl = await uploadFile(req.file as Express.Multer.File);
      restaurant.imageUrl = imageUrl;
    }

    await restaurant.save();

    res.status(200).json(restaurant);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error while updating the user restaurant",
    });
  }
};

const uploadFile = async (file: Express.Multer.File) => {
  const image = file;
  const base64Image = Buffer.from(image.buffer).toString("base64");
  const dataURI = `data:${image.mimetype};base64,${base64Image}`;

  const uploadedResponse = await cloudinary.v2.uploader.upload(dataURI);
  return uploadedResponse.url;
};

export default {
  updateOrderStatus,
  getMyRestaurantOrder,
  getMyRestaurant,
  createMyRestaurant,
  updateMyRestaurant,
};
