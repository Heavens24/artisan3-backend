const express = require("express");
const router = express.Router();
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post("/ai", async (req, res) => {
  try {
    const { imageUrl, prompt } = req.body;

    if (!imageUrl && !prompt) {
      return res.status(400).json({
        error: "Image URL or prompt is required",
      });
    }

    const userPrompt = `
You are a professional maintenance expert.

Analyze the image (if provided) and/or text.

Return ONLY valid JSON in this format:

{
  "problem": "",
  "solution": "",
  "tools": [],
  "severity": "Low | Medium | High",
  "estimatedCost": "",
  "nextMaintenanceDays": number
}

Rules:
- Be specific and practical
- Solutions must be step-by-step
- Tools must be realistic
- Severity must be one of: Low, Medium, High
- nextMaintenanceDays:
  Low = 90
  Medium = 30
  High = 7
`;

    const messages = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt || "Analyze this maintenance issue",
          },
          ...(imageUrl
            ? [
                {
                  type: "image_url",
                  image_url: {
                    url: imageUrl,
                  },
                },
              ]
            : []),
        ],
      },
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini", // fast + cheap + supports vision
      messages,
      temperature: 0.3,
    });

    let aiText = response.choices[0].message.content;

    // 🔧 CLEAN RESPONSE (VERY IMPORTANT)
    aiText = aiText.replace(/```json/g, "").replace(/```/g, "").trim();

    let parsed;

    try {
      parsed = JSON.parse(aiText);
    } catch (err) {
      console.error("JSON parse error:", err);

      return res.status(500).json({
        error: "AI returned invalid JSON",
        raw: aiText,
      });
    }

    // 🔮 AUTO CALCULATE NEXT DATE
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + (parsed.nextMaintenanceDays || 30));

    return res.json({
      success: true,
      data: {
        ...parsed,
        nextMaintenanceDate: nextDate,
        createdAt: new Date(),
      },
    });
  } catch (error) {
    console.error("AI ERROR:", error);

    return res.status(500).json({
      error: "AI processing failed",
      details: error.message,
    });
  }
});

module.exports = router;