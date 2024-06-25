const express = require("express");
const puppeteer = require("puppeteer");
const cors = require("cors");
const fs = require("fs").promises;
const path = require("path");

const app = express();
app.use(cors());

let browserInstance = null;

async function getBrowserInstance() {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
        "--window-size=1920x1080",
        "--disable-web-security",
      ],
    });
  }
  return browserInstance;
}

// Function to save image to local file system as WebP format
async function saveImageLocally(imageBuffer, fileName) {
  const imagesDir = path.join(__dirname, "images");
  await fs.mkdir(imagesDir, { recursive: true }); // Create images directory if it doesn't exist

  const filePath = path.join(imagesDir, fileName);
  await fs.writeFile(filePath, imageBuffer);
  return fileName;
}

// Function to generate a clean filename from the URL
function generateFileName(url, width, height, quality, scale) {
  const domainName = new URL(url).hostname.replace(
    /\.(com|io|ca|com\.np)$/,
    ""
  ); // Remove domain suffixes
  return `${domainName}_${width}x${height}_${quality}_${scale}.webp`;
}

app.get(
  "/get/width/:width/height/:height/quality/:quality/scale/:scale/:url",
  async (req, res) => {
    const { width, height, quality, scale, url } = req.params;

    let formattedUrl = decodeURIComponent(url);
    if (
      !formattedUrl.startsWith("http://") &&
      !formattedUrl.startsWith("https://")
    ) {
      formattedUrl = "http://" + formattedUrl; // Default to http if no scheme is provided
    }

    try {
      const browser = await getBrowserInstance();
      const page = await browser.newPage();

      await page.setViewport({
        width: Number(width) || 1920,
        height: Number(height) || 1080,
        deviceScaleFactor: Number(scale) || 1,
      });

      await page.goto(formattedUrl, { waitUntil: "networkidle0" });

      const screenshotBuffer = await page.screenshot({
        type: "webp", // Capture as WebP format
        quality: Number(quality) || 80,
        fullPage: Number(height) === 0,
      });

      const fileName = generateFileName(
        formattedUrl,
        width,
        height,
        quality,
        scale
      );
      const savedFileName = await saveImageLocally(screenshotBuffer, fileName);

      await page.close();

      const base64Image = `data:image/webp;base64,${screenshotBuffer.toString(
        "base64"
      )}`;

      // Set caching headers for 1 day (adjust as needed)
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.json({ imageUrl: base64Image, savedFileName });
    } catch (error) {
      console.error("Error capturing screenshot:", error);
      res.status(500).json({ error: "Failed to capture screenshot" });
    }
  }
);

const port = process.env.PORT || 5000;
app.listen(port, () =>
  console.log(`Server running on http://localhost:${port}`)
);
