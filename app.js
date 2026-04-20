const express = require("express");
const cors = require("cors");
const stripe = require("stripe")(process.env.STRIPE_KEY);
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

// SHIPPING
app.post("/shipping", async (req, res) => {
  try {
    const { pincode } = req.body;

    const shipment = await axios.post(
      "https://api.easypost.com/v2/shipments",
      {
        shipment: {
          to_address: {
            zip: pincode,
            country: "US"
          },
          from_address: {
            zip: "35244",
            country: "US"
          },
          parcel: {
            length: 10,
            width: 8,
            height: 2,
            weight: 300
          }
        }
      },
      {
        auth: {
          username: process.env.EASYPOST_KEY,
          password: ""
        }
      }
    );

    const cheapest = shipment.data.rates.sort((a,b)=>a.rate-b.rate)[0];

    res.json({ amount: parseFloat(cheapest.rate) });

  } catch (e) {
    res.status(500).send("Shipping error");
  }
});

// STRIPE
app.post("/checkout", async (req, res) => {
  const { cart, shipping } = req.body;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      ...cart.map(item => ({
        price_data: {
          currency: "usd",
          product_data: { name: item.name },
          unit_amount: item.price * 100
        },
        quantity: 1
      })),
      {
        price_data: {
          currency: "usd",
          product_data: { name: "Shipping" },
          unit_amount: shipping * 100
        },
        quantity: 1
      }
    ],
    mode: "payment",
    success_url: "https://yourwebsite.com/success",
    cancel_url: "https://yourwebsite.com/cancel"
  });

  res.json({ url: session.url });
});

app.listen(3000, () => console.log("running"));
