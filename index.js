const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// const jwt = require('jsonwebtoken');
// const nodemailer = require('nodemailer');
// const mg = require('nodemailer-mailgun-transport');
require('dotenv').config();
// const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const port = process.env.PORT || 5000;

const app = express();

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.15mo10v.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const database = client.db('ProductsDB');
        const productCollection = database.collection('Products');
        const categoryCollection = database.collection('Categories');
        const bookingsCollection = database.collection('bookings');
        const userCollection = database.collection("users");

        app.get('/', async (req, res) => {
            const query = {};
            if (req.query.image_id) {
                query = {
                    image_id: req.query.image_id
                }
            }
            const cursor = productCollection.find(query);
            const products = await cursor.toArray();
            //const products = await cursor.limit(6).toArray();
            res.send(products);
        })
        app.get('/categories', async(req, res) => {
            const query = {};
            const cursor = categoryCollection.find(query);
            const categories = await cursor.toArray();
            res.send(categories)
        });

        app.get('/category/:id', async(req, res) => {
            const id = req.params.id;
            const query = {};
            if (!id) {
                res.send("Sorry! Not Found")
            }
            else if (id === '04') {
                const cursor = productCollection.find(query);
                const categories = await cursor.toArray();
                res.send(categories)
            }
            else{
                const query = { category_id: id };
                const cursor = productCollection.find(query);
                const products = await cursor.toArray();
                res.send(products)
            }
        });
        app.get('/products', async (req, res) => {
            const page = parseInt(req.query.page);
            const showData = parseInt(req.query.showData);
            const query = {};
            const cursor = productCollection.find(query);
            const products = await cursor.skip(page * showData).limit(showData).toArray();
            const count = await productCollection.estimatedDocumentCount();
            res.send({ count, products });
        })
        app.get('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const product = await productCollection.findOne(query);
            res.send(product);
        })

        // NOTE: make sure you use verifySeller after verifyJWT
        const verifySeller = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await userCollection.findOne(query);

            if (user?.user_type !== 'Seller') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }

        app.post('/product', async (req, res) => {
            const review = req.body;
            // console.log(review);
            const result = await productCollection.insertOne(review)
            res.send(result);
        });

        //User
        app.post('/users', async (req, res) => {
            const user = req.body;
            console.log(user);
            // TODO: make sure you do not enter duplicate user email
            const query = {
                email: user.email,
            }

            const hasUser = await userCollection.find(query).toArray();

            if (hasUser.length) {
                const message = `You are already registered ${user.email}`
                return res.send({ acknowledged: false, message })
            }
            // only insert users if the user doesn't exist in the database
            const result = await userCollection.insertOne(user);
            // console.log(user);
            const accessToken = jwt.sign({ user }, process.env.ACCESS_TOKEN, { expiresIn: '1h' })
            res.send({ result, accessToken })
        })

        app.put('/users/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { email: email};
            const user = req.body;
            // console.log(user);
            const option = { upsert: true };
            const updatedUser = {
                $set: { user,
                    user_type: 'Seller' }
            }
            const result = await userCollection.updateOne(filter, updatedUser, option);
            const accessToken = jwt.sign({ updatedUser }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ result, accessToken});
        })

        //Bookings
        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            console.log(booking);
            const query = {
                product_Item: booking.product_Item,
                email: booking.email,
            }

            const alreadyBooked = await bookingsCollection.find(query).toArray();

            if (alreadyBooked.length) {
                const message = `You already have a booking on ${booking.product_Item}`
                return res.send({ acknowledged: false, message })
            }

            const result = await bookingsCollection.insertOne(booking);
            // send email about appointment confirmation 
            //sendBookingEmail(booking)
            res.send(result);
        });
        
    }
    finally {

    }
}
run().catch(console.dir);


app.get('/', async (req, res) => {
    res.send('Products portal server is running');
})

app.listen(port, () => console.log(`Products portal running on ${port}`))