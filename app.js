const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");
const EasyPostClient = require("@easypost/api");

const app = express();
app.use(cors());
app.use(express.json());

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const easypost = new EasyPostClient(process.env.EASYPOST_API_KEY);

app.get("/", (req, res) => {
  res.send("Backend is running");
});

app.post("/get-shipping-rates", async (req, res) => {
  try {
    const { toAddress } = req.body;

    const shipment = await easypost.Shipment.create({
      from_address: {
        name: "Face Eternity",
        street1: "1829 Lake Cyrus Club Dr.Hoover  ",
        city: "Hoover",
        state: "AL",
        zip: "35244",
        country: "US",
        phone: "+16782697951",
        email: "info@faceeternity.org",
      },
      to_address: toAddress,
      parcel: {
        length: 10,
        width: 8,
        height: 2,
        weight: 16,
      },
    });

    res.json({ rates: shipment.rates });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Shipping rate error" });
  }
});

app.post("/create-checkout-session", async (req, res) => {
  try {
    const { productName, productPrice, shippingName, shippingPrice } = req.body;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: productName,
            },
            unit_amount: Math.round(productPrice * 100),
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Shipping - ${shippingName}`,
            },
            unit_amount: Math.round(shippingPrice * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL}/success.html`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel.html`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Checkout error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
