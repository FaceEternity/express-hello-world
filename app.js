const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");

const app = express();
app.use(cors());
app.use(express.json());

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Shipping logic
function getShipping(price) {
  if (price >= 50) return 0;
  return 5;
}

app.post("/checkout", async (req, res) => {
  try {
    const { name, price } = req.body;

    const shipping = getShipping(price);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",

      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name },
            unit_amount: Math.round(price * 100)
          },
          quantity: 1
        },
        {
          price_data: {
            currency: "usd",
            product_data: { name: "Shipping" },
            unit_amount: shipping * 100
          },
          quantity: 1
        }
      ],

      success_url: "https://faceeternity.org/success",
      cancel_url: "https://faceeternity.org/cancel"
    });

    res.json({ url: session.url });

  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating checkout");
  }
});

app.listen(3000, () => console.log("Server running"));
