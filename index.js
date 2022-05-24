const express = require("express");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const { ObjectID } = require("bson");
require("dotenv").config();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Verifying Token From User
const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "UnAuthorize Access" });
  }

  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    req.decoded = decoded;
    next();
  });
};

// Database Connection
const uri = `mongodb+srv://${process.env.dbUser}:${process.env.dbPassword}@cluster0.njw5u.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// Database Operations
async function run() {
  try {
    await client.connect();
    const productCollection = client.db("tool_planet").collection("products");
    const userCollection = client.db("tool_planet").collection("users");
    const orderCollection = client.db("tool_planet").collection("orders");
    const reviewCollection = client.db("tool_planet").collection("reviews");

    // Get all products or particular number of products from database (products components)
    app.get("/products", async (req, res) => {
      const dataSize = parseInt(req.query.size);
      if (dataSize) {
        const result = await productCollection
          .find()
          .sort({ _id: -1 })
          .skip(0)
          .limit(dataSize)
          .toArray();
        res.send(result);
      } else {
        const result = await productCollection.find().toArray();
        res.send(result);
      }
    });

    // Save user info on database when user register the app and also give them token whenever they registered or login (useToken component)
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email };
      const options = { upsert: true };
      const updateDoc = {
        $set: req.body,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      var token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET);
      res.send({ result, token });
    });

    // Get a particular product using ID (Order component)
    app.get("/product/:id", async (req, res) => {
      const result = await productCollection.findOne({
        _id: ObjectId(req.params.id),
      });
      res.send(result);
    });
    // Get all orders (orderForm component)
    app.post("/orders", async (req, res) => {
      const exists = await orderCollection.findOne({
        productId: req.body.productId,
        customerEmail: req.body.customerEmail,
      });
      if (exists)
        return res.send({
          success: false,
          info: "Already booked. Please order other products",
        });
      const result = await orderCollection.insertOne(req.body);
      res.send({ success: true, info: "Order Successful" });
    });
    // Get all orders of particular email (My orders components)
    app.get("/order", verifyJWT, async (req, res) => {
      if (req.query.email === req.decoded.email) {
        const orders = await orderCollection
          .find({ customerEmail: req.query.email })
          .toArray();
        res.send(orders);
      } else {
        return res.status(403).send({ message: "Forbidden Access" });
      }
    });
    // Delete order using ID (MyOrders Component)
    app.delete("/order/:id", verifyJWT, async (req, res) => {
      const result = await orderCollection.deleteOne({
        _id: ObjectID(req.params.id),
      });
      res.send(result);
    });

    // Post all reviews (AddAReviews component)
    app.post("/reviews", verifyJWT, async (req, res) => {
      const result = await reviewCollection.insertOne(req.body);
      res.send({ success: true, info: "Review Added Successful" });
    });
    // Get all reviews (Home component)
    app.get("/reviews", async (req, res) => {
      const reviews = await reviewCollection.find().toArray();
      res.send(reviews);
    });
  } finally {
    //   await client.close();
  }
}
run().catch(console.dir);

// Base API
app.get("/", (req, res) => {
  res.send("Tool Planet Server Running");
});

app.listen(port, () => {
  console.log(`Tool Planet listening on port ${port}`);
});
