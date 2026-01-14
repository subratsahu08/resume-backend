require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const admin = require("firebase-admin");

const app = express();
app.use(cors());
app.use(express.json());

// Firebase Admin Initialization
admin.initializeApp({
  credential: admin.credential.cert(require("./serviceAccountKey.json"))
});
const db = admin.firestore();

// Resume Generation API
app.post("/generate-resume", async (req, res) => {
  try {
    const { uid } = req.body;

    if (!uid) {
      return res.status(400).json({ error: "UID is required" });
    }

    // Fetch real user data
    const doc = await db.collection("users").doc(uid).get();
    if (!doc.exists) {
      return res.status(404).json({ error: "User profile not found" });
    }

    const data = doc.data();

    // Build AI prompt
    const prompt = `
Generate a professional, ATS-friendly resume.

Name: ${data.name}
Skills: ${data.skills}
Education: ${data.education}
Experience: ${data.experience}
Projects: ${data.projects}
Certifications: ${data.certifications}

Use headings and bullet points.
`;

    // Call GroqCloud AI
    const groqResponse = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const resumeText =
      groqResponse.data.choices[0].message.content;

    res.json({ resume: resumeText });

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Resume generation failed" });
  }
});

// Start server
app.listen(3000, () => {
  console.log("Backend running on port 3000");
});
