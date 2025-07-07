const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const admin = require('firebase-admin');
const serviceAccount = require('./firebaseServiceAccountKey.json'); // Make sure this file is in the backend folder

const app = express();
app.use(cors());
app.use(express.json());

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

let exchangeRate = 3000;

// Scrape Shein item data
app.post('/api/scrape', async (req, res) => {
  const { links, cartLinks } = req.body;

  if ((!links || links.length === 0) && (!cartLinks || cartLinks.length === 0)) {
    return res.status(400).json({ message: 'No links provided' });
  }

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  let results = [];

  const allLinks = [...links, ...cartLinks];

  for (const link of allLinks) {
    try {
      await page.goto(link, { waitUntil: 'networkidle2' });
      const data = await page.evaluate(() => {
        const title = document.querySelector('h1')?.innerText || 'No title found';
        const priceElement = document.querySelector('[class*="price"]') || document.querySelector('[class*="Price"]');
        const priceText = priceElement ? priceElement.innerText.replace(/[^0-9.]/g, '') : '0';
        const price = parseFloat(priceText);
        const image = document.querySelector('img')?.src || '';

        return { title, price, image };
      });

      const item = {
        title: data.title,
        priceUSD: data.price,
        priceMWK: data.price * exchangeRate,
        image: data.image,
        link: link,
      };

      results.push(item);
    } catch (error) {
      console.error(`Error scraping ${link}:`, error);
    }
  }

  await browser.close();
  res.json(results);
});

// Update exchange rate
app.post('/api/updateRate', (req, res) => {
  const { newRate } = req.body;
  if (!newRate) return res.status(400).json({ message: 'New rate not provided' });
  exchangeRate = newRate;
  res.json({ rate: exchangeRate });
});

// Dummy users list (replace with Firebase storage later if needed)
let users = [];

// Fetch users (simulate database)
app.get('/api/users', (req, res) => {
  res.json(users);
});

// Update payment status
app.post('/api/updatePayment', (req, res) => {
  const { userId, isPaid } = req.body;

  users = users.map(user => user.id === userId ? { ...user, isPaid } : user);

  res.json({ message: 'Payment status updated' });
});

// Update tracking status
app.post('/api/updateTracking', (req, res) => {
  const { userId, trackingStatus } = req.body;

  users = users.map(user => user.id === userId ? { ...user, trackingStatus } : user);

  res.json({ message: 'Tracking status updated' });
});

// Save order history
app.post('/api/saveOrder', async (req, res) => {
  try {
    const { phone, orders } = req.body;
    if (!phone || !orders) return res.status(400).json({ message: 'Missing phone or orders.' });

    const userOrdersRef = db.collection('orders').doc(phone);
    const existingOrders = await userOrdersRef.get();

    if (existingOrders.exists) {
      await userOrdersRef.update({
        history: admin.firestore.FieldValue.arrayUnion(...orders)
      });
    } else {
      await userOrdersRef.set({ history: orders });
    }

    res.json({ message: 'Order saved successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to save order' });
  }
});

// Get order history
app.get('/api/orderHistory/:phone', async (req, res) => {
  try {
    const phone = req.params.phone;
    const userOrdersRef = db.collection('orders').doc(phone);
    const doc = await userOrdersRef.get();

    if (!doc.exists) {
      return res.json({ history: [] });
    }

    res.json({ history: doc.data().history });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch order history' });
  }
});

// Server running
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
