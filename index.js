const express = require("express");
const http = require("http");
const puppeteer = require("puppeteer");
const cors = require("cors");

const app = express();

// Use CORS and allow the frontend domain
app.use(
  cors({
    origin: "https://thumblino.vercel.app", // Change this to your actual frontend URL
  })
);

let browserInstance = null;

async function getBrowserInstance() {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch();
  }
  return browserInstance;
}

app.get(
  "/get/width/:width/height/:height/quality/:quality/:url",
  async (req, res) => {
    const { width, height, quality, url } = req.params;

    try {
      const browser = await getBrowserInstance();
      const page = await browser.newPage();

      // Set viewport size
      if (Number(height) === 0) {
        // Capture full page screenshot with desktop viewport
        await page.setViewport({
          width: Number(width) || 1920,
          height: 1080,
          isMobile: false,
        });
        await page.goto(decodeURIComponent(url), { waitUntil: "networkidle0" });
        const screenshotBuffer = await page.screenshot({
          type: "jpeg",
          quality: Number(quality) || 80,
          fullPage: true,
        });
        await page.close(); // Close the page after screenshot
        const base64Image = `data:image/jpeg;base64,${screenshotBuffer.toString(
          "base64"
        )}`;
        res.json({ imageUrl: base64Image });
      } else {
        // Capture specified viewport size
        await page.setViewport({
          width: Number(width) || 1920,
          height: Number(height) || 1080,
        });
        await page.goto(decodeURIComponent(url), { waitUntil: "networkidle0" });
        const screenshotBuffer = await page.screenshot({
          type: "jpeg",
          quality: Number(quality) || 80,
        });
        await page.close(); // Close the page after screenshot
        const base64Image = `data:image/jpeg;base64,${screenshotBuffer.toString(
          "base64"
        )}`;
        res.json({ imageUrl: base64Image });
      }
    } catch (error) {
      console.error("Error capturing screenshot:", error);
      res.status(500).json({ error: "Failed to capture screenshot" });
    }
  }
);

const port = 5000;
app.listen(port, () =>
  console.log(`Server running on http://localhost:${port}`)
);
