// Backend: Express Server to handle scraping and Firebase integration
// File: backend/server.js

const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

let exchangeRate = 3000; // Default rate

app.post('/api/scrape', async (req, res) => {
  const { links } = req.body;
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    const results = [];

    for (let link of links) {
      await page.goto(link, { waitUntil: 'networkidle2' });
      const item = await page.evaluate(() => {
        let title = document.querySelector('h1')?.innerText || 'No title';
        let price = document.querySelector('.product-intro__head-price .original')?.innerText || '0';
        let image = document.querySelector('.item-container img')?.src || '';
        return { title, price, image };
      });

      const priceUSD = parseFloat(item.price.replace(/[^\d.]/g, ''));
      item.priceUSD = priceUSD;
      item.priceMWK = priceUSD * exchangeRate;
      results.push(item);
    }

    await browser.close();
    res.json(results);
  } catch (error) {
    if (browser) await browser.close();
    res.status(500).json({ error: 'Scraping failed', details: error.message });
  }
});

app.post('/api/updateRate', (req, res) => {
  const { newRate } = req.body;
  exchangeRate = newRate;
  res.json({ message: 'Rate updated successfully', rate: exchangeRate });
});

app.listen(port, () => console.log(`Server running on port ${port}`));
