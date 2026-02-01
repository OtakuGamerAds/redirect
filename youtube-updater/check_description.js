const fs = require("fs");
const http = require("http");
const open = require("open");
const destroyer = require("server-destroy");
const { google } = require("googleapis");

const VIDEO_ID = "ipvBVyw1PG0";
const CREDENTIALS_PATH = "client_secret.json";
const SCOPES = ["https://www.googleapis.com/auth/youtube.force-ssl"];
const TOKEN_PATH = "tokens.json";

async function main() {
  const oAuth2Client = await authenticate(CREDENTIALS_PATH, SCOPES);
  const youtube = google.youtube({ version: "v3", auth: oAuth2Client });

  try {
    console.log(`Fetching details for video: ${VIDEO_ID}...`);
    const res = await youtube.videos.list({
      part: "snippet",
      id: VIDEO_ID,
    });

    if (res.data.items.length === 0) {
      console.error("Video not found.");
      return;
    }

    const video = res.data.items[0];
    const desc = video.snippet.description;

    console.log("--- DESCRIPTION START ---");
    console.log(desc);
    console.log("--- DESCRIPTION END ---");

    fs.writeFileSync("description_debug.txt", desc);
    console.log("Description saved to description_debug.txt");

    fs.writeFileSync("description_debug.json", JSON.stringify(desc, null, 2));
  } catch (error) {
    console.error("Error executing script:", error);
  }
}

async function authenticate(keyPath, scopes) {
  const keys = JSON.parse(fs.readFileSync(keyPath, "utf8"));
  const { client_secret, client_id } = keys.installed || keys.web;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    "http://localhost:3000",
  );

  // Check if we have saved tokens
  if (fs.existsSync(TOKEN_PATH)) {
    const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
    oAuth2Client.setCredentials(tokens);
    console.log("Loaded tokens from disk.");
    return oAuth2Client;
  }

  return new Promise((resolve, reject) => {
    const authorizeUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
    });

    const server = http
      .createServer(async (req, res) => {
        try {
          console.log(`DEBUG: Callback received for URL: ${req.url}`);

          if (req.url.indexOf("/favicon.ico") > -1) {
            res.statusCode = 404;
            res.end();
            return;
          }

          const urlObj = new URL(req.url, "http://localhost:3000");
          const params = Object.fromEntries(urlObj.searchParams);
          const { code, error } = params;

          if (error) {
            console.error("DEBUG: OAuth Error returned:", error);
            res.end(`Authentication failed: ${error}`);
            return;
          }
          if (!code) {
            console.log("DEBUG: No code found in URL, ignoring request.");
            res.end('No code provided in request. Did you click "Allow"?');
            return;
          }

          res.end("Authentication successful! You can close this tab.");

          const { tokens } = await oAuth2Client.getToken(code);
          oAuth2Client.setCredentials(tokens);

          // Save tokens
          fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
          console.log("Tokens saved to disk.");

          resolve(oAuth2Client);

          setTimeout(() => {
            console.log("DEBUG: Destroying server...");
            server.destroy();
          }, 2000);
        } catch (e) {
          console.error(e);
          res.end("Error");
          reject(e);
        }
      })
      .listen(3000, () => {
        open(authorizeUrl);
        console.log("Please authenticate in the browser...");
      });
    destroyer(server);
  });
}

main();
