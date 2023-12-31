const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const app = express();
const port = process.env.PORT || 5000;

//middleware
const corsOptions = {
  origin: 'http://localhost:5173',
  credentials: true,            //access-control-allow-credentials:true
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions))
app.use(express.json());





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.u8allbd.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const userCollection = client.db('eternalDb').collection('users');
    const biodataCollection = client.db('eternalDb').collection('biodatas');
    const favouriteCollection = client.db('eternalDb').collection('favourites');
    const premiumCollection = client.db('eternalDb').collection('makepremium');

    // users related API

    app.get('/users', async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    })

    app.get('/user/admin/:email', async (req, res) => {
      try {
        const email = req.params.email;

        // Assuming you have a MongoDB collection named 'users'
        const user = await userCollection.findOne({ email });

        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }

        // Check if the user has the admin role
        const isAdmin = user.role === 'admin';

        res.json({ isAdmin });
      } catch (error) {
        console.error('Error checking admin status:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // save a users data
    app.post('/users', async (req, res) => {
      const user = req.body;
      console.log(user);
      // insert email if user doesnt exist
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists', insertId: null })
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    })


    // request for premium from view my biodata page
    app.post('/premiums', async (req, res) => {
      const requester = req.body;
      console.log(requester);
    
      // Insert email if the user doesn't exist
      const query = { contactEmail: requester.contactEmail };
      const existingUser = await userCollection.findOne(query);
    
      if (existingUser) {
        return res.send({ message: 'user already exists', insertId: null });
      }
    
      const result = await premiumCollection.insertOne(requester);
      res.send({ message: 'Premium request submitted successfully', insertId: result.insertedId });
    });

    // get the premium requested users
    app.get('/premiums', async (req, res) => {
      const result = await premiumCollection.find().toArray();
      res.send(result);
    })

    // make a user premium
    app.patch('/acceptPremium/:email', async (req, res) => {
      const email = req.params.email;
      console.log(email);
    
      const filter = { contactEmail: email };
      const filtertwo = { email: email };
      const updatedDoc = {
        $set: {
          status: 'premium'
        }
      };
    
      const result = await premiumCollection.updateOne(filter, updatedDoc);
      const resultOne = await biodataCollection.updateOne(filter, updatedDoc);
      const resultTwo = await userCollection.updateOne(filtertwo, updatedDoc);
    
      res.send({
        premiumResult: result,
        biodataResult: resultOne,
        userResult: resultTwo
      });
    });
    



    // make a user admin
    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc)
      res.send(result);
    })

    // Define the route with a parameter :email
    app.get('/biodatas/:email', async (req, res) => {
      const userEmail = req.params.email;
      console.log(userEmail);
      const query = { contactEmail: userEmail };
      const result = await biodataCollection.findOne(query);
      console.log(result);
      res.send(result)

    });


    

    

    // delete a favourite from user dashboard
    app.delete('/favourites/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await favouriteCollection.deleteOne(query);
      res.send(result);
    })

     // create a biodata if the email is new, if the email exists them upsert it and give an biodataId

    app.post('/biodatas', async (req, res) => {
      const user = req.body;
      console.log(user);

      // Get the total number of documents in the collection
      const totalBiodatas = await biodataCollection.countDocuments();

      // Calculate the new biodata id
      const newBiodataId = totalBiodatas + 1;

      // Set the new biodata id in the user object
      biodataId = newBiodataId;

      // Define the query based on the email
      const query = { contactEmail: user.contactEmail };

      // Define the update operation
      const update = {
        $set: {
          biodataType: user.biodataType,
          name: user.name,
          image: user.image,
          dateOfBirth: user.dateOfBirth,
          height: user.height,
          weight: user.weight,
          age: user.age,
          occupation: user.occupation,
          race: user.race,
          fathersName: user.fathersName,
          mothersName: user.mothersName,
          permanentDivision: user.permanentDivision,
          presentDivision: user.presentDivision,
          expectedPartnerAge: user.expectedPartnerAge,
          expectedPartnerHeight: user.expectedPartnerHeight,
          expectedPartnerWeight: user.expectedPartnerWeight,
          contactEmail: user.contactEmail,
          mobileNumber: user.mobileNumber,
          BiodataId: biodataId,
        }
      };

      // Set the upsert option to true
      const options = { upsert: true };

      try {
        // Use updateOne with upsert option
        const result = await biodataCollection.updateOne(query, update, options);

        // Check if the document was inserted or updated
        if (result.upsertedCount > 0) {
          res.send({ message: 'user inserted successfully', insertId: result.upsertedId._id });
        } else {
          res.send({ message: 'user updated successfully', insertId: null });
        }
      } catch (error) {
        console.log(error);
        res.status(500).send({ error: 'Internal Server Error' });
      }
    });


    // get biodata and filter
    app.get('/biodatas', async (req, res) => {
      try {
        const { minAge, maxAge, biodataType, permanentDivision } = req.query;

        // Build the filter object based on the provided query parameters
        const filter = {};
        if (minAge && maxAge) {
          filter.age = { $gte: parseInt(minAge), $lte: parseInt(maxAge) };
        }
        if (biodataType) {
          filter.biodataType = biodataType;
        }
        if (permanentDivision) {
          filter.permanentDivision = permanentDivision;
        }

        const cursor = biodataCollection.find(filter);
        const result = await cursor.toArray();
        res.send(result);
      } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
      }
    });

    // get biodata and filter for biodataType
    app.get('/biodatas', async (req, res) => {
      try {
        const { biodataType } = req.query;
        console.log(biodataType);

        // Build the filter object based on the provided query parameters
        const filter = {};

        if (biodataType) {
          filter.biodataType = biodataType;
        }
        const cursor = biodataCollection.find(filter);
        const result = await cursor.toArray();
        res.send(result);
      } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
      }
    });

    // get premium biodatas
    app.get('/premiumBiodatas', async (req, res) => {
      try {
        const premiumBiodatas = await biodataCollection.find({ status: 'premium' }).toArray();
        res.send(premiumBiodatas);
      } catch (error) {
        console.error('Error fetching premium biodatas:', error);
        res.status(500).send({ error: 'Internal server error' });
      }
    });

    // get one requested biodata by id
    app.get('/getbiodatabyid/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id, '233');
      const query = { _id: new ObjectId(id) };
      const result = await biodataCollection.findOne(query);
      console.log(result, 'result 236');
      res.send(result);
    });

    // add one favourite and show error if that one is already added
    app.post('/favourites', async (req, res) => {
      const favItem = req.body;
      const result = await favouriteCollection.insertOne(favItem);
      res.send(result);
    });

    // show all favourite biodatas
    app.get('/favourites', async (req, res) => {
      const cursor = favouriteCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    // success counter data
    
app.get('/successCounter', async (req, res) => {
  try {
    // Total biodata count
    const totalBiodataCount = await biodataCollection.countDocuments();

    // Gender-wise biodata count
    const maleBiodataCount = await biodataCollection.countDocuments({ biodataType: 'male' });
    const femaleBiodataCount = await biodataCollection.countDocuments({ biodataType: 'female' });

    

    res.send({
      totalBiodataCount,
      maleBiodataCount,
      femaleBiodataCount,
      
    });
  } catch (error) {
    console.error('Error fetching success counter data:', error);
    res.status(500).send({ error: 'Internal server error' });
  }
});




    // stripe

    app.get('/create-payment-intent', async(req, res)=>{
      const {price} = '500';
      const amount = parseInt(price * 100);
      console.log(amount, 'from line 314');

      const paymentIntent = await stripe.paymentIntent.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })

    })




    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);





app.get('/', (req, res) => {
  res.send('eternal-ties is running')
})

app.listen(port, () => {
  console.log(`eternal-ties server is running on ${port}`);
})