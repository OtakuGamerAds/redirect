const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");

admin.initializeApp();

// Define the secret
const githubPat = defineSecret("GITHUB_PAT");

/**
 * Cloud Function: triggerGitHubAction
 * 
 * Securely triggers the GitHub Action to rebuild the site.
 * Only authenticated users can call this function.
 * The GitHub PAT is stored as a Firebase secret, never exposed to clients.
 */
exports.triggerGitHubAction = onCall(
    { 
        secrets: [githubPat],
        cors: true 
    },
    async (request) => {
        // 1. Verify authentication
        if (!request.auth) {
            throw new HttpsError(
                "unauthenticated",
                "You must be logged in to trigger a publish."
            );
        }

        // 2. Get the secret PAT
        const pat = githubPat.value();
        if (!pat) {
            throw new HttpsError(
                "failed-precondition",
                "GitHub PAT not configured."
            );
        }

        // 3. Trigger the GitHub Action
        const owner = "OtakuGamerAds";
        const repo = "rahumi";
        const workflowFile = "build-from-firebase.yml";

        try {
            const response = await fetch(
                `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowFile}/dispatches`,
                {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${pat}`,
                        "Accept": "application/vnd.github.v3+json",
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ ref: "main" })
                }
            );

            if (!response.ok && response.status !== 204) {
                const errorText = await response.text();
                console.error("GitHub API error:", response.status, errorText);
                throw new HttpsError(
                    "internal",
                    "Failed to trigger GitHub Action."
                );
            }

            console.log(`GitHub Action triggered by user: ${request.auth.uid}`);
            return { success: true, message: "GitHub Action triggered successfully!" };

        } catch (error) {
            console.error("Error triggering GitHub Action:", error);
            if (error instanceof HttpsError) throw error;
            throw new HttpsError(
                "internal",
                "Error triggering GitHub Action."
            );
        }
    }
);

// Define the Gemini API Key secret
const geminiApiKey = defineSecret("GEMINI_API_KEY");

const SYSTEM_PROMPT = `
### **System Prompt: صانع مقالات رحومي الاحترافي**

**1. هويتك (Persona):**
أنت اليوتيوبر العربي "رحومي" (Rahumi). أسلوبك في الكتابة هو نفس أسلوبك في فيديوهاتك: مرح، طاقوي، وودود مع متابعيك الذين تناديهم بـ "يا أخواااان" أو "يا أساطير". تحب استخدام العامية البسيطة والمفهومة، وتضيف لمسة من الفكاهة، خصوصاً إذا كان هناك صديق لعبت معه (مثل أوتاكو)، حيث تقوم بإلقاء بعض المزاح عليه. تستخدم الرموز التعبيرية (Emojis) بشكل مناسب لإضافة الحيوية للنص.

**2. هدفك (Objective):**
مهمتك هي كتابة مقالة قصيرة ومسلية لموقعي الإلكتروني، مبنية على فيديو يوتيوب قمت بنشره. المقالة ليست مجرد ملخص، بل هي **محتوى ذو قيمة** يقدم للمتابعين نصائح وأسرار ذكية اكتشفتها أثناء اللعب. يجب أن تجعل المقالة المتابع يشعر أنه حصل على أسرار حصرية ستفيده عند لعب اللعبة، مما يشجعه على قراءة مقالاتك الأخرى. المقالة يجب أن تكون قصيرة ومباشرة وسهلة القراءة.

**3. هيكل المقالة (Structure):**
يجب أن تتبع المقالة الهيكل التالي بدقة:

*   **العنوان:** ابدأ بسؤال جذاب ومثير للفضول، ثم اذكر "\${GAME_NAME}"، واختم بعلامة تعجب.
    *   *مثال: كيف تهزم الزعيم الأخير؟ أسراري الخفية في لعبة \${GAME_NAME}!*

*   **المقدمة:**
    *   ابدأ بتحيتك الشهيرة "أهلاً يا أخواااان!".
    *   اذكر أن الكثيرين شاهدوا الفيديو الأخير لك (واذكر اسم الصديق الذي لعبت معه إن وجد).
    *   قل أنك قررت مشاركة أهم الأسرار والنصائح التي اكتشفتها في هذه المقالة.

*   **قسم "ما هي فكرة اللعبة؟":**
    *   اشرح فكرة اللعبة الرئيسية بشكل مبسط جداً في فقرة قصيرة (سطرين أو ثلاثة). استخدم رمزًا تعبيريًا مناسبًا. واستخدم "\${GAME_NAME}" بدلاً من اسم اللعبة الحقيقي.

*   **القسم الرئيسي "ملاحظات ذكية لازم تعرفها":**
    *   استخدم هذا العنوان أو عنوان مشابه مثل "أسرار رحومي للمحترفين!".
    *   حوّل الملاحظات التي سأعطيك إياها إلى قائمة مرقمة.
    *   لكل ملاحظة، ضع عنواناً قصيراً وجذاباً بالخط العريض.
    *   اشرح كل ملاحظة بأسلوبك الخاص، وقم بربطها بموقف مضحك أو مثير حدث في الفيديو (مثلاً: "...مثل ما شفتوا بالفيديو لما بلعت بالغلط"). هذا الربط يجعل المقالة شخصية وحصرية.

*   **الخاتمة:**
    *   اختم المقالة بفقرة قصيرة تشجع فيها المتابعين على تجربة اللعبة وتطبيق النصائح.
    *   اطلب منهم التفاعل في التعليقات (مثلاً: "قولوا لي بالتعليقات ايش أفضل سر فادكم!").

*   **الوداع:**
    *   استخدم عبارتك الختامية "بيباي! 👋".

---
**4. المعلومات التي سأزودك بها في كل مرة (Your Input):**
في كل مرة أطلب منك كتابة مقالة، سأعطيك فيديو ويجب ان تستخرج منه المعلومات ادناه لتستخدمها في الهيكل أعلاه:

1.  **اسم اللعبة:** يجب أن تستخدم النص "\${GAME_NAME}" دائماً وابداً بدلاً من استخراج اسم اللعبة.
2.  **اسم الصديق (إن وجد):** [اسم الصديق، أو اتركه فارغاً]
3.  **قائمة الملاحظات والأسرار:** [قائمة قصيرة من 3-5 نقاط اكتشفتها أثناء اللعب]

---
**5. ردك:**
يجب ان يكون ردك بدون مقدمات او نهاية او شيء مشابه، وانما فقط رد كامل بالمقال المطلوب بصيغة md.
`;

const USER_PROMPT_TEMPLATE = `
اكتب لي مقالة قصيرة عن هذه اللعبة في روبلوكس. المقالة سوف يتم وضعها في موقعي الخاص (انا اليوتيوبر الذي يلعب اللعبة في هذا الفيديو) قل في المقالة معلومات بسيطة عن ما هي هذه اللعبة مع ملاحظات ذكية قمت باكتشافها اثناء لعبي لها. المقالة يجب ان تكون مسلية ومفيدة (ليس فقط ملء للموقع، وانما شيء ذو قيمة عندما يقرأه المتابع يصبح يريد ان يقرأ المقالات الاخرى عن الألعاب الثانية قبل لعبهم) - يجب ان لا تكون طويلة لأن الفئة المستهدفة ليست كبيرة بالعمر وبالتالي لا تحب ان تقرأ كثيراً.
`;

/**
 * Cloud Function: generateArticle
 * 
 * Uses Google Gemini 1.5 Pro to generate a markdown article from a YouTube video.
 */
exports.generateArticle = onCall(
    {
        secrets: [geminiApiKey],
        timeoutSeconds: 1200, // 20 minutes timeout for extended generation
        cors: true,
        invoker: "public" // Required for 2nd Gen functions to be callable by Firebase SDK
    },
    async (request) => {
        // 1. Verify authentication
        if (!request.auth) {
            throw new HttpsError(
                "unauthenticated",
                "You must be logged in to generate articles."
            );
        }

        const { videoUrl, requestId } = request.data;
        if (!videoUrl) {
            throw new HttpsError(
                "invalid-argument",
                "videoUrl is required."
            );
        }

        // Helper to log progress to Firestore
        const logProgress = async (message, type = "info") => {
            if (requestId) {
                try {
                    await admin.firestore().collection("generation_logs").doc(requestId).set({
                        message: message,
                        type: type,
                        timestamp: admin.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                } catch (e) {
                    console.error("Failed to write log:", e);
                }
            }
        };

        const apiKey = geminiApiKey.value();
        if (!apiKey) {
            throw new HttpsError(
                "failed-precondition",
                "Gemini API Key not configured."
            );
        }

        try {
            // Import dynamically as @google/genai is likely ESM
            const { GoogleGenAI } = await import("@google/genai"); 
            const ai = new GoogleGenAI({ apiKey: apiKey });

            // User requested specific model
            const modelName = "gemini-2.5-pro"; 
            
            const contents = [
                 {
                    role: 'user',
                    parts: [
                        { fileData: { fileUri: videoUrl, mimeType: "video/mp4" } },
                        { text: USER_PROMPT_TEMPLATE }
                    ]
                 }
            ];

            // Retry logic
            const maxRetries = 3;
            let retryCount = 0;
            let response;
            let lastError;

            while (retryCount < maxRetries) {
                try {
                    const attemptMsg = `Attempt ${retryCount + 1} of ${maxRetries} to generate content...`;
                    console.log(attemptMsg);
                    await logProgress(attemptMsg, "info");

                    response = await ai.models.generateContent({
                        model: modelName, 
                        contents: contents,
                        config: {
                            systemInstruction: SYSTEM_PROMPT,
                            temperature: 0.7,
                            safetySettings: [
                                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                            ]
                        },
                        timeout: 1200000 // 20 minutes timeout for the SDK request
                    });
                    
                    if (response && response.text) {
                        await logProgress("Content generated successfully!", "success");
                        break; // Success
                    }
                } catch (error) {
                    const errorMsg = `Attempt ${retryCount + 1} failed: ${error.message}`;
                    console.error(errorMsg);
                    await logProgress(errorMsg, "error");
                    
                    // Check for Quota Exceeded (429) or other non-retriable errors
                    // error.status might be available, or check message text
                    if (error.status === 429 || error.message.includes("RESOURCE_EXHAUSTED")) {
                         await logProgress("Quota exceeded (429). Stopping retries to save time.", "error");
                         lastError = error;
                         break; // Don't retry on hard quota limits
                    }

                    lastError = error;
                    retryCount++;
                    
                    if (retryCount < maxRetries) {
                         // Exponential backoff: 2s, 4s, 8s
                         const delay = Math.pow(2, retryCount) * 1000;
                         const waitMsg = `Retrying in ${delay / 1000}s...`;
                         console.log(waitMsg);
                         await logProgress(waitMsg, "warning");
                         await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
            }

            if (!response || !response.text) {
                const finalErrorMsg = lastError ? lastError.message : "Failed to generate content after retries.";
                await logProgress(`Final failure: ${finalErrorMsg}`, "error");
                throw lastError || new Error("Failed to generate content after retries.");
            }

            const generatedText = response.text;

            if (!generatedText) {
                throw new Error("No text generated from Gemini.");
            }

            return { success: true, article: generatedText };

        } catch (error) {
            console.error("Gemini Generation Error:", error);
            throw new HttpsError(
                "internal",
                "Failed to generate article: " + error.message
            );
        }
    }
);
