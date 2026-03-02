import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const SUBMISSIONS_FILE = path.join(__dirname, "submissions.json");

// MIDDLEWARE
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.static(__dirname));

// Serve portfolio.html at root
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "portfolio.html")));

// Health check
app.get("/ping", (req, res) => res.send("ok"));

// HELPERS
function readSubmissions() {
  if (!fs.existsSync(SUBMISSIONS_FILE)) return [];
  const raw = fs.readFileSync(SUBMISSIONS_FILE, "utf-8");
  try { return JSON.parse(raw); } catch { return []; }
}

function saveSubmission(entry) {
  const all = readSubmissions();
  all.push(entry);
  fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(all, null, 2));
}

function validateFields({ fname, email, message }) {
  const errors = [];
  if (!fname || !fname.trim()) errors.push("First name is required.");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Valid email is required.");
  if (!message || !message.trim()) errors.push("Message is required.");
  return errors;
}

// CONTACT ROUTE
app.post("/api/contact", async (req, res) => {
  const { fname, lname, email, subject, message, website } = req.body;

  if (website) return res.status(200).json({ ok: true });

  const errors = validateFields({ fname, email, message });
  if (errors.length) return res.status(400).json({ ok: false, errors });

  const fullName = `${fname} ${lname || ""}`.trim();
  const submittedAt = new Date().toISOString();

  // Save to local JSON file
  try {
    saveSubmission({ fullName, email, subject: subject || "", message, submittedAt });
  } catch (err) {
    console.error("Failed to save submission:", err);
  }

  // Send email via Resend API (works on Render free tier)
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Portfolio Contact <onboarding@resend.dev>",
        to: process.env.GMAIL_USER,
        reply_to: email,
        subject: subject ? `[Contact] ${subject}` : `[Contact] New message from ${fullName}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px">
            <h2 style="margin-top:0;color:#111">New Contact Form Submission</h2>
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:8px 0;color:#6b7280;width:100px">Name</td><td style="padding:8px 0"><strong>${fullName}</strong></td></tr>
              <tr><td style="padding:8px 0;color:#6b7280">Email</td><td style="padding:8px 0"><a href="mailto:${email}">${email}</a></td></tr>
              <tr><td style="padding:8px 0;color:#6b7280">Subject</td><td style="padding:8px 0">${subject || "-"}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;vertical-align:top">Message</td><td style="padding:8px 0;white-space:pre-wrap">${message}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280">Sent at</td><td style="padding:8px 0">${new Date(submittedAt).toLocaleString()}</td></tr>
            </table>
            <p style="margin-bottom:0;color:#9ca3af;font-size:12px">Reply to this email to respond directly to ${fullName}.</p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(JSON.stringify(err));
    }
  } catch (err) {
    console.error("Failed to send email:", err);
    return res.status(500).json({ ok: false, errors: ["Email delivery failed. Your message was saved locally."] });
  }

  return res.status(200).json({ ok: true });
});

// START
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Submissions saved to: ${SUBMISSIONS_FILE}`);
});
