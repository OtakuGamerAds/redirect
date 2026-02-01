const puppeteer = require("puppeteer");
const fs = require("fs");

// --- CONFIGURATION ---
const VIDEO_ID = "ipvBVyw1PG0";
const NEW_LINK = `https://rahumi.com/article/?id=${VIDEO_ID}`;
// Use simple regex string for evaluate
const ROBLOX_REGEX_SRC = "https:\/\/www\.roblox\.com\/games\/\\S+";
const STUDIO_URL = `https://studio.youtube.com/video/${VIDEO_ID}/edit`;

const DESCRIPTION_TEXTBOX_SELECTOR = "#textbox";
const SAVE_BUTTON_SELECTOR = "#save"; // Corrected selector

async function main() {
  console.log("Connecting to existing browser...");
  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: "http://127.0.0.1:9222",
      defaultViewport: null,
    });
  } catch (e) {
    console.error("Could not connect to browser.", e.message);
    return;
  }

  const pages = await browser.pages();
  const page = pages.length > 0 ? pages[0] : await browser.newPage();

  console.log(`Navigating to YouTube Studio: ${STUDIO_URL}`);
  await page.goto(STUDIO_URL, { waitUntil: "domcontentloaded" });

  console.log("Waiting for description editor...");
  try {
    await page.waitForSelector(DESCRIPTION_TEXTBOX_SELECTOR, {
      timeout: 60000,
    });

    // Find the correct textbox
    const textboxes = await page.$$(DESCRIPTION_TEXTBOX_SELECTOR);
    let descriptionTextbox = null;

    for (let i = 0; i < textboxes.length; i++) {
      const text = await page.evaluate((el) => el.textContent, textboxes[i]);
      if (
        text.includes("رابط الماب") ||
        text.includes("https://www.roblox.com/games/")
      ) {
        descriptionTextbox = textboxes[i];
        console.log(`DEBUG: Found description textbox (index ${i})`);
        break;
      }
    }

    if (!descriptionTextbox) {
      console.error("Could not find description textbox.");
      browser.disconnect();
      return;
    }

    // Scroll into view
    await descriptionTextbox.evaluate((el) => el.scrollIntoView());

    // Improved Selection Logic
    console.log("Attempting to select the link text...");

    const selectionResult = await page.evaluate(
      (box, regexStr) => {
        const regex = new RegExp(regexStr);

        // Helper: Find contenteditable parent or self
        const editable =
          box.closest('[contenteditable="true"]') ||
          box.querySelector('[contenteditable="true"]') ||
          box;

        function findTextNode(node) {
          if (
            node.nodeType === Node.TEXT_NODE &&
            regex.test(node.textContent)
          ) {
            return node;
          }
          for (const child of node.childNodes) {
            const found = findTextNode(child);
            if (found) return found;
          }
          return null;
        }

        const textNode = findTextNode(editable);
        if (!textNode) return { success: false, msg: "Text node not found" };

        const match = textNode.textContent.match(regex);
        if (!match) return { success: false, msg: "Regex match failed" };

        // Create range
        const range = document.createRange();
        range.setStart(textNode, match.index);
        range.setEnd(textNode, match.index + match[0].length);

        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);

        // Crucial: Focus the editable element
        editable.focus();

        return {
          success: true,
          selectedText: sel.toString(),
          tagName: editable.tagName,
          isContentEditable: editable.isContentEditable,
        };
      },
      descriptionTextbox,
      ROBLOX_REGEX_SRC,
    );

    if (!selectionResult.success) {
      console.error("Selection failed:", selectionResult.msg);
      browser.disconnect();
      return;
    }

    console.log(
      `Reference Node Tag: ${selectionResult.tagName}, ContentEditable: ${selectionResult.isContentEditable}`,
    );
    console.log(`Selected Text: "${selectionResult.selectedText}"`);

    // Overwriting
    console.log("Overwriting selection with new link...");
    await page.keyboard.type(NEW_LINK);

    // Short wait for UI update and verification
    await new Promise((r) => setTimeout(r, 1000));
    const newText = await page.evaluate(
      (el) => el.textContent,
      descriptionTextbox,
    );
    if (!newText.includes(NEW_LINK)) {
      console.error("Verification FAILED: Link text did not change.");
    } else {
      console.log("Verification: Link text UPDATED successfully.");
    }

    // --- SAVE LOGIC ---
    console.log("Waiting for Save button to enable...");
    try {
      // Wait for aria-disabled="false"
      await page.waitForFunction(
        (selector) => {
          const btn = document.querySelector(selector);
          return btn && btn.getAttribute("aria-disabled") === "false";
        },
        { timeout: 5000 },
        SAVE_BUTTON_SELECTOR,
      );

      console.log("Clicking Save...");

      // Try clicking the valid internal button first (most reliable for YouTube)
      const clicked = await page.evaluate((selector) => {
        const btnHost = document.querySelector(selector);
        if (!btnHost) return false;

        // Try inner button first
        const innerBtn = btnHost.querySelector("button");
        if (innerBtn) {
          innerBtn.click();
          return "inner button";
        }

        // Fallback to host
        btnHost.click();
        return "host element";
      }, SAVE_BUTTON_SELECTOR);

      console.log(`Clicked ${clicked}.`);

      // Wait for the button to become disabled again (indicating save started/finished)
      await page.waitForFunction(
        (selector) => {
          const btn = document.querySelector(selector);
          return btn && btn.getAttribute("aria-disabled") === "true";
        },
        { timeout: 20000 },
        SAVE_BUTTON_SELECTOR,
      );
      console.log("Success! Save operation completed.");
    } catch (e) {
      console.error(
        "Save failed or timed out. Attempting fallback input event...",
      );

      // Fallback: Dispatch input event to force dirty state
      await page.evaluate((box) => {
        const editable =
          box.closest('[contenteditable="true"]') ||
          box.querySelector('[contenteditable="true"]') ||
          box;
        editable.dispatchEvent(new Event("input", { bubbles: true }));
      }, descriptionTextbox);

      await new Promise((r) => setTimeout(r, 1000));

      const btnState = await page.evaluate(
        (s) => document.querySelector(s)?.getAttribute("aria-disabled"),
        SAVE_BUTTON_SELECTOR,
      );
      console.log(`Save button state after fallback: ${btnState}`);

      if (btnState === "false") {
        await page.click(SAVE_BUTTON_SELECTOR);
        console.log("Clicked Save (Retry).");
      } else {
        console.error("Save button still disabled.");
      }
    }
  } catch (error) {
    console.error("An error occurred:", error);
  } finally {
    console.log("Disconnecting...");
    browser.disconnect();
  }
}

main();
