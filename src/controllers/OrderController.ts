import { Request, Response } from "express";
import Stripe from "stripe";
import Restaurant, { MenuItemType } from "../models/restaurant";
import Order from "../models/order";

const STRIPE = new Stripe(process.env.STRIPE_API_KEY as string);

const FRONTEND_URL = process.env.FRONTEND_URL as string;

const STRIPE_ENDPOINT_SECRET = process.env.STRIPE_WEBHOOK_SECRET as string;

const getMyOrders = async (req: Request, res: Response) => {
  try {
    const orders = await Order.find({ user: req.userId })
      .populate("restaurant")
      .populate("user");

    if (!orders) {
      return res.status(404).json({
        message: "No orders found",
      });
    }

    res.status(200).json(orders);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error while getting the orders",
    });
  }
};

type CheckoutSessionRequest = {
  cartItems: {
    menuItemId: string;
    name: string;
    quantity: string;
  }[];

  deliveryDetails: {
    email: string;
    name: string;
    addressLineOne: string;
    city: string;
  };
  restaurantId: string;
};

const stripeWebhookHandler = async (req: Request, res: Response) => {
  let event;
  try {
    const sig = req.headers["stripe-signature"];
    event = STRIPE.webhooks.constructEvent(
      req.body,
      sig as string,
      STRIPE_ENDPOINT_SECRET
    );
  } catch (error: any) {
    console.log(error);
    return res.status(500).send(`Webhook error : ${error.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const order = await Order.findById(event.data.object.metadata?.orderId);

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    if (
      event.data.object.amount_total === null ||
      event.data.object.amount_total === undefined
    ) {
      console.log(
        `Amount total is missing for order ID ${event.data.object.metadata?.orderId}`
      );
      return res.status(400).json({
        message: "Amount total is missing in the event data",
      });
    }

    order.totalAmount = (event.data.object.amount_total as number) / 100; // Convert to INR

    console.table([order.totalAmount, event.data.object.amount_total]);
    order.status = "paid";

    await order.save();
  }

  res.status(200).send();
};

const createCheckoutSession = async (req: Request, res: Response) => {
  try {
    // get the data from the user
    const checkoutSessionRequest: CheckoutSessionRequest = req.body;

    // find the restaurant for the price as user can send the price from the frontend which will cuase the issue
    const restaurant = await Restaurant.findById(
      checkoutSessionRequest.restaurantId
    );

    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    const newOrder = new Order({
      restaurant: restaurant,
      user: req.userId,
      status: "placed",
      deliveryDetails: checkoutSessionRequest.deliveryDetails,
      cartItems: checkoutSessionRequest.cartItems,
      createdAt: new Date(),
    });

    // Create the line Items for the stripe payment page
    const lineItems = createLineItems(
      checkoutSessionRequest,
      restaurant.menuItems
    );

    const session = await createSession(
      lineItems,
      newOrder._id.toString(),
      restaurant.deliveryPrice,
      restaurant._id.toString()
    );

    if (!session.url) {
      return res.status(500).json({
        message: "Error while creating the stripe session",
      });
    }

    await newOrder.save();
    res.status(200).json({
      url: session.url,
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      message: error.raw.message,
    });
  }
};

const createLineItems = (
  checkoutSessionRequest: CheckoutSessionRequest,
  menuItems: MenuItemType[]
) => {
  // 1. For each cartItem, get the menuItem object  from the restaurant to get the price
  // 2 for each cartItem , convert the it to the stripe line item
  // 3. return the line items array

  const lineItems = checkoutSessionRequest.cartItems.map((cartItem) => {
    const menuItem = menuItems.find(
      (menuItem) => menuItem._id.toString() === cartItem.menuItemId.toString()
    );

    if (!menuItem) {
      throw new Error(`Menu Item not found : ${cartItem.menuItemId}`);
    }

    const line_item: Stripe.Checkout.SessionCreateParams.LineItem = {
      price_data: {
        currency: "inr",
        unit_amount: menuItem.price * 100, // Convert rupees to paise
        product_data: {
          name: menuItem.name,
        },
      },
      quantity: parseInt(cartItem.quantity),
    };

    return line_item;
  });

  return lineItems;
};

const createSession = async (
  lineItems: Stripe.Checkout.SessionCreateParams.LineItem[],
  orderId: string,
  deliveryPrice: number,
  restaurantId: string
) => {
  const sessionData = await STRIPE.checkout.sessions.create({
    line_items: lineItems,
    shipping_options: [
      {
        shipping_rate_data: {
          display_name: "Delivery",
          type: "fixed_amount",
          fixed_amount: {
            amount: deliveryPrice * 100, // Convert rupees to paise
            currency: "inr",
          },
        },
      },
    ],
    mode: "payment",
    metadata: {
      orderId,
      restaurantId,
    },
    success_url: `${FRONTEND_URL}/order-status?success=true`,
    cancel_url: `${FRONTEND_URL}/detail/${restaurantId}?cancelled=true`,
  });

  return sessionData;
};

export default {
  getMyOrders,
  createCheckoutSession,
  stripeWebhookHandler,
};
