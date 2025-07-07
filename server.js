// server.js

const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Initialize Firebase Admin SDK using environment variable
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Route: Test
app.get('/', (req, res) => {
  res.send('Webbuy Malawi backend is running.');
});

// Route: Scrape
app.post('/api/scrape', async (req, res) => {
  try {
    const { links, cartLinks } = req.body;

    // Simulate scraping
    const scrapedItems = links.map((link, index) => ({
      title: `Item ${index + 1}`,
      image: 'https://via.placeholder.com/150',
      priceUSD: (Math.random() * 20 + 10).toFixed(2),
      priceMWK: Math.round((Math.random() * 20 + 10) * 3000),
    }));

    const cartItems = cartLinks.map((link, index) => ({
      title: `Cart Item ${index + 1}`,
      image: 'https://via.placeholder.com/150',
      priceUSD: (Math.random() * 50 + 20).toFixed(2),
      priceMWK: Math.round((Math.random() * 50 + 20) * 3000),
    }));

    const allItems = [...scrapedItems, ...cartItems];
    res.json(allItems);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Scraping failed' });
  }
});

// Route: Get Users
app.get('/api/users', async (req, res) => {
  try {
    const usersSnapshot = await db.collection('users').get();
    const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Route: Update Payment
app.post('/api/updatePayment', async (req, res) => {
  try {
    const { userId, isPaid } = req.body;
    await db.collection('users').doc(userId).update({ isPaid });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update payment' });
  }
});

// Route: Update Tracking
app.post('/api/updateTracking', async (req, res) => {
  try {
    const { userId, trackingStatus } = req.body;
    await db.collection('users').doc(userId).update({ trackingStatus });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update tracking' });
  }
});

// Route: Update Rate
app.post('/api/updateRate', async (req, res) => {
  try {
    const { newRate } = req.body;
    const rateRef = db.collection('settings').doc('rate');
    await rateRef.set({ rate: newRate });
    res.json({ rate: newRate });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update rate' });
  }
});

// Route: Get Rate
app.get('/api/rate', async (req, res) => {
  try {
    const rateDoc = await db.collection('settings').doc('rate').get();
    if (rateDoc.exists) {
      res.json(rateDoc.data());
    } else {
      res.json({ rate: 3000 });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch rate' });
  }
});

// Port for Render
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
