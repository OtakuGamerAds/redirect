/**
 * YouTube Description Updater
 * Reference: https://developers.google.com/youtube/v3/docs/videos/update
 */

const fs = require("fs");
const http = require("http");
const open = require("open");
const destroyer = require("server-destroy");
const { google } = require("googleapis");

// --- CONFIGURATION ---
const VIDEO_ID = "ipvBVyw1PG0";
const CREDENTIALS_PATH = "client_secret.json";
const SCOPES = ["https://www.googleapis.com/auth/youtube.force-ssl"];
const TOKEN_PATH = "tokens.json";

const NEW_LINK = `https://rahumi.com/article/?id=${VIDEO_ID}`;
const ROBLOX_REGEX = /https:\/\/www\.roblox\.com\/games\/\S+/g;

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
    const currentDescription = video.snippet.description;

    // Backup original description
    fs.writeFileSync("description_backup.txt", currentDescription);
    console.log("Original description backed up to description_backup.txt");

    const matches = currentDescription.match(ROBLOX_REGEX);

    if (!matches) {
      console.log("No Roblox game links found in the description. Exiting.");
      return;
    }

    if (matches.length > 1) {
      console.log(
        `Safety Abort: Found ${matches.length} Roblox links. Expected exactly 1. No changes made.`,
      );
      return;
    }

    const newDescription = currentDescription.replace(ROBLOX_REGEX, NEW_LINK);

    console.log("------------------------------------------------");
    console.log(`Old Link found: ${matches[0]}`);
    console.log(`New Link to insert: ${NEW_LINK}`);
    console.log("------------------------------------------------");

    // Create update object preserving ALL important metadata
    const { title, categoryId, defaultLanguage, tags, defaultAudioLanguage } =
      video.snippet;

    const snippetUpdate = {
      title,
      categoryId,
      description: newDescription,
    };

    // Conditionally add optional fields if they exist
    if (tags) snippetUpdate.tags = tags;
    if (defaultLanguage) snippetUpdate.defaultLanguage = defaultLanguage;
    if (defaultAudioLanguage)
      snippetUpdate.defaultAudioLanguage = defaultAudioLanguage;

    console.log("Updating video with comprehensive snippet...");
    console.log("Preserved tags:", tags ? tags.length : 0);

    await youtube.videos.update({
      part: "snippet",
      requestBody: {
        id: VIDEO_ID,
        snippet: snippetUpdate,
      },
    });

    console.log("Success! Video description updated.");
    console.log("Please check YouTube to verify mentions are active.");
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
    try {
      const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
      oAuth2Client.setCredentials(tokens);
      console.log("Loaded tokens from disk.");
      return oAuth2Client;
    } catch (e) {
      console.log("Error reading tokens, re-authenticating...");
    }
  }

  return new Promise((resolve, reject) => {
    const authorizeUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
    });

    const server = http
      .createServer(async (req, res) => {
        try {
          if (req.url.indexOf("/favicon.ico") > -1) {
            res.statusCode = 404;
            res.end();
            return;
          }

          const urlObj = new URL(req.url, "http://localhost:3000");
          const params = Object.fromEntries(urlObj.searchParams);
          const { code, error } = params;

          if (error) {
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

          fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
          console.log("Tokens saved to disk.");

          resolve(oAuth2Client);

          setTimeout(() => {
            server.destroy();
          }, 2000);
        } catch (e) {
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
