const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");

const app = express();

app.use(cors());
app.use(express.json());

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

app.get("/", (req, res) => {
  res.send("Backend is running");
});

app.post("/get-shipping-rates", async (req, res) => {
  try {
    const { address } = req.body;

    const shipment = {
      shipment: {
        to_address: {
          name: address.name,
          street1: address.street1,
          street2: address.street2 || "",
          city: address.city,
          state: address.state,
          zip: address.zip,
          country: address.country,
          phone: address.phone || "",
          email: address.email
        },
        from_address: {
          name: "Face Eternity",
          street1: process.env.SHIP_FROM_STREET1,
          city: process.env.SHIP_FROM_CITY,
          state: process.env.SHIP_FROM_STATE,
          zip: process.env.SHIP_FROM_ZIP,
          country: process.env.SHIP_FROM_COUNTRY || "US",
          phone: process.env.SHIP_FROM_PHONE
        },
        parcel: {
          length: 9,
          width: 6,
          height: 1,
          weight: 16
        }
      }
    };

    const response = await fetch("https://api.easypost.com/v2/shipments", {
      method: "POST",
      headers: {
        "Authorization": "Basic " + Buffer.from(process.env.EASYPOST_API_KEY + ":").toString("base64"),
        "Content-Type": "application/json"
      },
      body: JSON.stringify(shipment)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(400).json({ error: data.error?.message || "EasyPost error" });
    }

    const rates = data.rates
      .map(r => ({
        carrier: r.carrier,
        service: r.service,
        amount: Number(r.rate)
      }))
      .sort((a, b) => a.amount - b.amount)
      .slice(0, 5);

    res.json({ rates });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/create-checkout-session", async (req, res) => {
  try {
    const { cart, shipping } = req.body;

    const line_items = cart.map(item => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: `${item.name} - ${item.variant}`
        },
        unit_amount: Math.round(Number(item.price) * 100)
      },
      quantity: 1
    }));

    line_items.push({
      price_data: {
        currency: "usd",
        product_data: {
          name: `Shipping - ${shipping.carrier} ${shipping.service}`
        },
        unit_amount: Math.round(Number(shipping.amount) * 100)
      },
      quantity: 1
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      success_url: "https://faceeternity.org/success.html",
      cancel_url: "https://faceeternity.org/cancel.html"
    });

    res.json({ url: session.url });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
