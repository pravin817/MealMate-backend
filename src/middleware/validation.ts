import { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";

const handleValidatioErrors = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array(),
    });
  }
  next();
};

export const validateMyUserRequest = [
  body("name").isString().notEmpty().withMessage("Name must be string"),
  body("addressLineOne")
    .isString()
    .notEmpty()
    .withMessage("Address Line One must be string"),
  body("city").isString().notEmpty().withMessage("City must be string"),
  body("country").isString().notEmpty().withMessage("Country must be city"),
  handleValidatioErrors,
];

export const validateMyRestaurantRequest = [
  body("restaurantName").notEmpty().withMessage("Restaurant Name is required"),
  body("city").notEmpty().withMessage("City Name is required"),
  body("country").notEmpty().withMessage("Country Name is required"),
  body("deliveryPrice")
    .isFloat({ min: 0 })
    .withMessage("Delivery Price is required"),
  body("estimatedDeliveryTime")
    .isInt({ min: 0 })
    .withMessage("Estimated delivery time must be positive integer."),
  body("cuisines")
    .isArray()
    .withMessage("Cuisines must be an array")
    .not()
    .isEmpty()
    .withMessage("Cuisines array cannot be empty"),

  body("menuItems").isArray().withMessage("Menu Items must be an array"),
  body("menuItems.*.name")
    .isString()
    .notEmpty()
    .withMessage("Menu Item name is required"),
  body("menuItems.*.price")
    .isFloat({ min: 0 })
    .withMessage("Menu Item price is required and must be positive number"),
  handleValidatioErrors,
];
