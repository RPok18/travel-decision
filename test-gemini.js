const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI("[GCP_API_KEY]");

async function test() {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hello!");
        console.log(result.response.text());
    } catch (e) {
        console.error("Error:", e);
    }
}

test();
