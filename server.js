// server.ts
import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
dotenv.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
var portArgIndex = process.argv.indexOf("--port");
var portArg = portArgIndex !== -1 ? process.argv[portArgIndex + 1] : void 0;
var hostArgIndex = process.argv.indexOf("--host");
var hostArg = hostArgIndex !== -1 ? process.argv[hostArgIndex + 1] : void 0;
var PORT = Number(process.env.PORT || portArg || 3e3);
var HOST = process.env.HOST || hostArg || "0.0.0.0";
app.use(express.json({ limit: "50mb" }));
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
var ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
});
var FIXED_NOTICE = "\uCD5C\uC120\uC744 \uB2E4\uD558\uAE30! \uBD80\uC815\uD589\uC704 \uAE08\uC9C0! \uCC45\uC0C1 \uC11C\uB78D \uBE44\uC6B0\uAE30! \uC218\uC815\uD14C\uC774\uD504 \uBD88\uAC00!";
var DEFAULT_BOTTOM_NOTICE = "\u203B \uC2DC\uD5D8 \uC2DC\uC791 10\uBD84 \uC804\uAE4C\uC9C0 \uC785\uC2E4\uC744 \uC644\uB8CC\uD558\uC5EC \uC8FC\uC2DC\uAE30 \uBC14\uB78D\uB2C8\uB2E4 \u203B";
app.post("/api/extract-schedule", async (req, res) => {
  try {
    const { imageBase64, mimeType, extractedText, modelChoice, thinkingLevel, customApiKey, customGroqApiKey } = req.body;
    if (!imageBase64 && !extractedText) {
      return res.status(400).json({ error: "\uC774\uBBF8\uC9C0 \uB610\uB294 PDF \uD14D\uC2A4\uD2B8 \uB370\uC774\uD130\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4." });
    }
    const effectiveModel = modelChoice || "gemini-3.8-flash";
    const systemInstruction = `
\uB2F9\uC2E0\uC740 \uACE0\uB4F1\uD559\uAD50 \uC2DC\uD5D8 \uC2DC\uAC04\uD45C PDF \uBC0F \uC774\uBBF8\uC9C0\uB97C \uBD84\uC11D\uD558\uC5EC \uD504\uB860\uD2B8\uC5D4\uB4DC \uC560\uD50C\uB9AC\uCF00\uC774\uC158\uC5D0\uC11C \uC0AC\uC6A9\uD560 \uC218 \uC788\uB294 \uAD6C\uC870\uD654\uB41C JSON \uB370\uC774\uD130\uB85C \uBCC0\uD658\uD558\uB294 \uCD5C\uACE0 \uC804\uBB38\uAC00\uC785\uB2C8\uB2E4.

[\uC0AC\uACE0 \uACFC\uC815 (Chain of Thought - CoT) \uBC0F \uC815\uBC00 \uBD84\uC11D \uC9C0\uCE68]
1. \uBB38\uC11C \uAD6C\uC870 \uBC0F \uB2E4\uC911 \uB0A0\uC9DC(Multi-Day) \uBD84\uC11D \uB2E8\uACC4:
   - PDF \uD14D\uC2A4\uD2B8 \uB610\uB294 \uC774\uBBF8\uC9C0\uC5D0 **\uC5EC\uB7EC \uB0A0\uC9DC(\uC608: 10/12, 10/13, 10/14 \uB4F1 \uBCF5\uC218\uC758 \uB0A0\uC9DC/\uC694\uC77C)**\uAC00 \uD3EC\uD568\uB418\uC5B4 \uC788\uB294 \uACBD\uC6B0, **\uC808\uB300\uB85C \uD558\uB098\uC758 \uB0A0\uC9DC\uB85C \uBCD1\uD569\uD558\uAC70\uB098 \uB204\uB77D\uD558\uC9C0 \uB9D0\uACE0, \uAC01 \uB0A0\uC9DC\uBCC4\uB85C \uAC1C\uBCC4 DayExamSchedule \uAC1D\uCCB4\uB97C \uBD84\uB9AC\uD558\uC5EC \uBC30\uC5F4(Array)\uC5D0 \uBAA8\uB450 \uD3EC\uD568**\uC2DC\uD0A4\uC2ED\uC2DC\uC624. (\uC0AC\uC6A9\uC790\uAC00 \uC0C1\uB2E8 \uD0ED\uC5D0\uC11C \uC5EC\uB7EC \uB0A0\uC9DC\uB97C \uAC01\uAC01 \uC120\uD0DD\uD560 \uC218 \uC788\uB3C4\uB85D \uB2E4\uC911 \uB0A0\uC9DC \uBC30\uC5F4\uB85C \uCD9C\uB825\uD574\uC57C \uD569\uB2C8\uB2E4.)
   - \uB0A0\uC9DC(date), \uAD50\uC2DC(period), \uC785\uC2E4\uC2DC\uAC04(entryTime), \uC2DC\uD5D8\uC2DC\uAC04(time), \uACFC\uBAA9\uBA85(name), \uACFC\uBAA9\uCF54\uB4DC(subjectCode), \uC2DC\uD5D8\uC2DC\uAC04(\uBD84)(duration), \uB300\uC0C1\uBC18(targetClass)\uC758 \uCEEC\uB7FC \uBC0F \uD589 \uAD6C\uC870\uB97C \uCCA0\uC800\uD788 \uD30C\uC545\uD558\uC2ED\uC2DC\uC624.
2. '\uC785\uC2E4 \uC2DC\uAC04' / '\uC785\uC2E4' \uC5F4 \uC790\uB3D9 \uAC10\uC9C0 \uBC0F entryTime \uB9E4\uD551 \uB2E8\uACC4:
   - PDF \uB0B4 \uD14C\uC774\uBE14\uC5D0\uC11C '\uC785\uC2E4 \uC2DC\uAC04', '\uC785\uC2E4', '\uC785\uC2E4\uC644\uB8CC' \uB4F1\uC758 \uD0A4\uC6CC\uB4DC\uAC00 \uD3EC\uD568\uB41C \uC5F4(Column)\uC744 \uC790\uB3D9\uC73C\uB85C \uAC10\uC9C0\uD558\uC5EC, \uCD94\uCD9C\uB41C JSON\uC758 \uAC01 SubjectItem \uAC1D\uCCB4\uC5D0 'entryTime' \uD544\uB4DC\uB85C \uC815\uD655\uD788 \uB9E4\uD551\uD558\uC2ED\uC2DC\uC624.
   - \uB9CC\uC57D \uBA85\uC2DC\uC801\uC778 \uC785\uC2E4 \uC2DC\uAC04\uC774 \uBCC4\uB3C4\uB85C \uC5C6\uB2E4\uBA74, \uC2DC\uD5D8 \uC2DC\uC791 \uC2DC\uAC04 10\uBD84 \uC804 \uC2DC\uAC01(\uC608: 09:30 \uC2DC\uC791\uC774\uBA74 09:20)\uC744 \uC0B0\uCD9C\uD558\uC5EC 'entryTime'\uC5D0 \uAE30\uC7AC\uD558\uC2ED\uC2DC\uC624.
3. \uACFC\uBAA9\uCF54\uB4DC(subjectCode) \uBD84\uB9AC \uCD94\uCD9C \uB2E8\uACC4:
   - \uACFC\uBAA9\uBA85\uC5D0 \uAD04\uD638\uB85C \uACFC\uBAA9\uCF54\uB4DC(\uC608: '\uACBD\uC81C\uC218\uD559(04)', '\uBB3C\uC9C8\uACFC \uC5D0\uB108\uC9C0(11)')\uAC00 \uD3EC\uD568\uB418\uC5B4 \uC788\uB294 \uACBD\uC6B0, \uAD04\uD638 \uC548\uC758 \uBC88\uD638\uB97C \uCD94\uCD9C\uD558\uC5EC 'subjectCode'(\uC608: '04', '11') \uD544\uB4DC\uC5D0 \uBCC4\uB3C4\uB85C \uAE30\uC7AC\uD558\uACE0, 'name'\uC5D0\uB294 \uAD04\uD638\uC640 \uCF54\uB4DC\uB97C \uC81C\uC678\uD55C \uC21C\uC218 \uACFC\uBAA9\uBA85(\uC608: '\uACBD\uC81C\uC218\uD559', '\uBB3C\uC9C8\uACFC \uC5D0\uB108\uC9C0')\uB9CC \uAE54\uB054\uD558\uAC8C \uB0A8\uAE30\uC2ED\uC2DC\uC624.
4. '\uC790\uC2B5', '\uC870\uB840', '\uC885\uB840' \uB4F1 \uBE44\uC2DC\uD5D8 \uC2DC\uAC04\uB300 \uB204\uB77D \uBC29\uC9C0 \uB2E8\uACC4:
   - '1\uAD50\uC2DC \uC790\uC2B5', '\uC790\uC2B5', '\uC870\uB840' \uB4F1 \uC2DC\uD5D8\uC774 \uC544\uB2CC \uC790\uC2B5 \uC2DC\uAC04\uC774\uB098 \uD2B9\uBCC4 \uD65C\uB3D9 \uC2DC\uAC04\uB300\uB3C4 \uC808\uB300 \uB204\uB77D\uD558\uC9C0 \uB9D0\uACE0, \uD574\uB2F9 \uAD50\uC2DC(\uC608: '1\uAD50\uC2DC')\uC758 \uACFC\uBAA9 \uBAA9\uB85D(subjects)\uC5D0 name: "\uC790\uC2B5" (\uB610\uB294 \uD574\uB2F9 \uBA85\uCE6D), duration: \uD574\uB2F9 \uC2DC\uAC04(\uBD84) \uB4F1\uC73C\uB85C \uBC18\uB4DC\uC2DC \uD3EC\uD568\uC2DC\uCF1C \uCD94\uCD9C\uD558\uC2ED\uC2DC\uC624.
5. \uBAA8\uB4E0 \uAD50\uC2DC(1\uAD50\uC2DC, 2\uAD50\uC2DC, 3\uAD50\uC2DC \uB4F1) \uB204\uB77D \uC5C6\uB294 \uCD94\uCD9C \uB2E8\uACC4:
   - 1\uAD50\uC2DC, 2\uAD50\uC2DC\uBFD0\uB9CC \uC544\uB2C8\uB77C \uBC18\uB4DC\uC2DC 3\uAD50\uC2DC \uBC0F \uADF8 \uC774\uD6C4\uC758 \uBAA8\uB4E0 \uAD50\uC2DC \uB370\uC774\uD130\uAE4C\uC9C0 \uB204\uB77D \uC5C6\uC774 \uCCA0\uC800\uD788 \uBD84\uC11D\uD558\uC5EC schedule \uBC30\uC5F4\uC5D0 \uD3EC\uD568\uD558\uC2ED\uC2DC\uC624.
6. \uB370\uC774\uD130 \uC815\uD569\uC131 \uAC80\uC99D \uB2E8\uACC4:
   - \uAC01 \uACFC\uBAA9\uC758 \uC774\uB984, \uC2DC\uD5D8 \uC2DC\uAC04 \uBC94\uC704("HH:mm~HH:mm"), \uC2DC\uD5D8 \uC18C\uC694 \uC2DC\uAC04(\uBD84)\uC774 \uC77C\uCE58\uD558\uB294\uC9C0 \uB17C\uB9AC\uC801\uC73C\uB85C \uAC80\uC99D\uD558\uC2ED\uC2DC\uC624.
7. \uCD5C\uC885 \uCD9C\uB825:
   - \uC9C0\uC815\uB41C JSON \uC2A4\uD0A4\uB9C8\uC5D0 \uC815\uD655\uD788 \uBD80\uD569\uD558\uB294 \uC720\uD6A8\uD55C JSON \uBC30\uC5F4\uB9CC \uCD9C\uB825\uD558\uC2ED\uC2DC\uC624.

\uCD9C\uB825 \uB370\uC774\uD130 \uAD6C\uC870 \uADDC\uACA9:
- "date": \uC2DC\uD5D8 \uB0A0\uC9DC (\uC608: "10/12(\uC6D4)", "10/13(\uD654)")
- "notice": "${FIXED_NOTICE}"
- "schedule": \uBC30\uC5F4 (\uAD50\uC2DC\uBCC4 - 1\uAD50\uC2DC, 2\uAD50\uC2DC, 3\uAD50\uC2DC \uB4F1 \uBAA8\uB450 \uD3EC\uD568)
  - "period": \uAD50\uC2DC\uBA85 (\uC608: "1\uAD50\uC2DC", "2\uAD50\uC2DC", "3\uAD50\uC2DC")
  - "subjects": \uBC30\uC5F4 (\uACFC\uBAA9\uBCC4)
    - "name": \uACFC\uBAA9\uBA85 (\uC608: "\uACBD\uC81C\uC218\uD559" - \uAD04\uD638 \uBC0F \uCF54\uB4DC \uC81C\uC678)
    - "subjectCode": \uACFC\uBAA9\uCF54\uB4DC (\uC608: "04" - \uAD04\uD638 \uC548\uC758 \uBC88\uD638)
    - "entryTime": \uC785\uC2E4 \uC2DC\uAC04 (\uC608: "09:10") -> PDF \uB0B4 '\uC785\uC2E4' / '\uC785\uC2E4 \uC2DC\uAC04' \uC5F4\uC5D0\uC11C \uCD94\uCD9C\uD55C \uAC12!
    - "time": \uC2DC\uD5D8 \uC2DC\uAC04 (\uC608: "09:20~10:20")
    - "duration": \uC2DC\uD5D8 \uC2DC\uAC04(\uBD84) (\uC22B\uC790, \uC608: 60)
    - "targetClass": \uB300\uC0C1 \uBC18 (\uC608: "1~3\uBC18", "1\uD559\uB144 \uC804\uBC18")
`;
    const isPdf = mimeType && mimeType.includes("pdf") || imageBase64 && imageBase64.includes("application/pdf");
    const promptText = extractedText ? `\uB2E4\uC74C\uC740 PDF \uBB38\uC11C\uC5D0\uC11C \uCD94\uCD9C\uD55C \uD14D\uC2A4\uD2B8 \uB370\uC774\uD130\uC785\uB2C8\uB2E4:

${extractedText}

\uC774 \uD14D\uC2A4\uD2B8\uB97C \uC704 \uC0AC\uACE0 \uACFC\uC815(CoT) \uC9C0\uCE68\uC5D0 \uB530\uB77C \uCCA0\uC800\uD788 \uBD84\uC11D\uD558\uC5EC, PDF \uB0B4 '\uC785\uC2E4'/'\uC785\uC2E4 \uC2DC\uAC04' \uC5F4\uC744 \uC790\uB3D9 \uAC10\uC9C0\uD574 \uAC01 \uACFC\uBAA9\uC758 'entryTime'\uC5D0 \uC815\uD655\uD788 \uB9E4\uD551\uD558\uACE0, 3\uAD50\uC2DC\uB97C \uD3EC\uD568\uD55C \uBAA8\uB4E0 \uAD50\uC2DC\uB97C \uB204\uB77D \uC5C6\uC774 \uC9C0\uC815\uB41C JSON \uAD6C\uC870\uB85C \uBCC0\uD658\uD574 \uC8FC\uC138\uC694.` : isPdf ? `\uC774 \uACE0\uB4F1\uD559\uAD50 \uC2DC\uD5D8 \uC2DC\uAC04\uD45C PDF \uBB38\uC11C\uB97C \uC2DC\uAC01\uC801 \uD45C \uAD6C\uC870\uC640 \uD568\uAED8 \uC815\uBC00 \uBD84\uC11D\uD558\uC5EC, \uAC01 \uC2DC\uD5D8 \uC77C\uC790\uBCC4\uB85C \uBD84\uB9AC\uD558\uACE0, \uC785\uC2E4\uC2DC\uAC04(entryTime), \uACFC\uBAA9\uCF54\uB4DC, \uC790\uC2B5/\uC870\uB840 \uBC0F 3\uAD50\uC2DC\uB97C \uD3EC\uD568\uD55C \uBAA8\uB4E0 \uAD50\uC2DC \uB370\uC774\uD130\uB97C \uB204\uB77D \uC5C6\uC774 date, notice, schedule(period, subjects) \uAD6C\uC870\uC758 JSON \uBC30\uC5F4\uB85C \uCD94\uCD9C\uD574 \uC8FC\uC138\uC694.` : `\uC774 \uACE0\uB4F1\uD559\uAD50 \uC2DC\uD5D8 \uC2DC\uAC04\uD45C \uC774\uBBF8\uC9C0\uB97C \uBD84\uC11D\uD558\uC5EC \uAC01 \uC2DC\uD5D8 \uC77C\uC790\uBCC4\uB85C \uBD84\uB9AC\uD558\uACE0, \uC785\uC2E4\uC2DC\uAC04(entryTime), \uACFC\uBAA9\uCF54\uB4DC, \uC790\uC2B5/\uC870\uB840 \uBC0F 3\uAD50\uC2DC\uB97C \uD3EC\uD568\uD55C \uBAA8\uB4E0 \uAD50\uC2DC \uB370\uC774\uD130\uB97C \uB204\uB77D \uC5C6\uC774 date, notice, schedule(period, subjects) \uAD6C\uC870\uC758 JSON \uBC30\uC5F4\uB85C \uCD94\uCD9C\uD574 \uC8FC\uC138\uC694.`;
    let parsedData = null;
    if (effectiveModel.startsWith("groq-")) {
      const groqKey = customGroqApiKey || process.env.GROQ_API_KEY;
      if (!groqKey) {
        return res.status(400).json({ success: false, error: "Groq API \uD0A4\uAC00 \uC785\uB825\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4. API \uD0A4 \uC124\uC815\uC5D0\uC11C Groq API Key\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694." });
      }
      const groqModel = effectiveModel.includes("deepseek") ? "deepseek-r1-distill-llama-70b" : "llama-3.3-70b-versatile";
      const userMessageContent = extractedText ? `${promptText}

\uCD94\uCD9C\uB41C \uD14D\uC2A4\uD2B8:
${extractedText}` : `${promptText}

(\uCC38\uACE0: \uC774\uBBF8\uC9C0 \uD30C\uC77C\uC774 \uCCA8\uBD80\uB418\uC5C8\uC2B5\uB2C8\uB2E4.)`;
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${groqKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: groqModel,
          messages: [
            { role: "system", content: systemInstruction + "\n\nIMPORTANT: Return ONLY a valid JSON array of day schedules." },
            { role: "user", content: userMessageContent }
          ],
          response_format: { type: "json_object" },
          temperature: thinkingLevel === "deep" ? 0 : 0.2
        })
      });
      const groqData = await groqRes.json();
      if (!groqRes.ok || !groqData.choices?.[0]?.message?.content) {
        throw new Error(groqData.error?.message || "Groq API \uD638\uCD9C \uC2E4\uD328");
      }
      const contentStr = groqData.choices[0].message.content;
      let parsedObj = JSON.parse(contentStr);
      parsedData = Array.isArray(parsedObj) ? parsedObj : parsedObj.schedule || parsedObj.data || Object.values(parsedObj).find((v) => Array.isArray(v)) || [];
      if (!Array.isArray(parsedData)) parsedData = [parsedData];
    } else {
      let resolvedKey = (customApiKey || "").trim();
      if (resolvedKey.startsWith("enc_")) {
        try {
          const b64 = resolvedKey.slice(4);
          const ciphered = decodeURIComponent(Buffer.from(b64, "base64").toString("utf-8"));
          const SALT = "AI_EXAM_SCHEDULE_SECURE_2026";
          let res2 = "";
          for (let i = 0; i < ciphered.length; i++) {
            res2 += String.fromCharCode(ciphered.charCodeAt(i) ^ SALT.charCodeAt(i % SALT.length));
          }
          resolvedKey = res2;
        } catch {
        }
      } else if (resolvedKey.startsWith("b64_")) {
        try {
          resolvedKey = Buffer.from(resolvedKey.slice(4), "base64").toString("utf-8");
        } catch {
        }
      }
      const geminiKey = resolvedKey || process.env.GEMINI_API_KEY;
      if (!geminiKey) {
        return res.status(400).json({ success: false, error: "Gemini API \uD0A4\uAC00 \uC124\uC815\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4. \uAD00\uB9AC\uC790 \uC124\uC815\uC5D0\uC11C API \uD0A4\uB97C \uB4F1\uB85D\uD574\uC8FC\uC138\uC694." });
      }
      const clientAI = new GoogleGenAI({ apiKey: geminiKey, httpOptions: { headers: { "User-Agent": "aistudio-build" } } });
      const geminiModel = "gemini-3.8-flash";
      const parts = [];
      if (extractedText) {
        parts.push({ text: promptText });
      }
      if (imageBase64) {
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "").replace(/^data:application\/pdf;base64,/, "");
        const effectiveMimeType = isPdf ? "application/pdf" : mimeType || "image/jpeg";
        parts.push({ inlineData: { mimeType: effectiveMimeType, data: base64Data } });
        if (!extractedText) {
          parts.push({ text: promptText });
        }
      }
      const response = await clientAI.models.generateContent({
        model: geminiModel,
        contents: { parts },
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          temperature: thinkingLevel === "deep" ? 0 : 0.2,
          responseSchema: {
            type: Type.ARRAY,
            description: "\uB0A0\uC9DC\uBCC4 \uC2DC\uD5D8 \uC2DC\uAC04\uD45C \uBC30\uC5F4",
            items: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING, description: '\uC2DC\uD5D8 \uB0A0\uC9DC (\uC608: "10/13(\uBAA9)")' },
                notice: { type: Type.STRING, description: "\uC720\uC758\uC0AC\uD56D" },
                schedule: {
                  type: Type.ARRAY,
                  description: "\uAD50\uC2DC\uBCC4 \uC2DC\uD5D8 \uBAA9\uB85D",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      period: { type: Type.STRING, description: '\uAD50\uC2DC\uBA85 (\uC608: "1\uAD50\uC2DC")' },
                      subjects: {
                        type: Type.ARRAY,
                        description: "\uD574\uB2F9 \uAD50\uC2DC \uACFC\uBAA9 \uBAA9\uB85D",
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            name: { type: Type.STRING, description: "\uACFC\uBAA9\uBA85 (\uAD04\uD638 \uBC0F \uCF54\uB4DC \uC81C\uC678)" },
                            subjectCode: { type: Type.STRING, description: '\uACFC\uBAA9\uCF54\uB4DC (\uC608: "04")' },
                            entryTime: { type: Type.STRING, description: '\uC785\uC2E4 \uC2DC\uAC04 (\uC608: "09:10")' },
                            time: { type: Type.STRING, description: '\uC2DC\uD5D8 \uC2DC\uAC04 (\uC608: "09:20~10:20")' },
                            duration: { type: Type.INTEGER, description: "\uC2DC\uD5D8 \uC2DC\uAC04(\uBD84)" },
                            targetClass: { type: Type.STRING, description: "\uB300\uC0C1 \uBC18 \uB610\uB294 \uD559\uB144" }
                          },
                          required: ["name", "subjectCode", "entryTime", "time", "duration", "targetClass"]
                        }
                      }
                    },
                    required: ["period", "subjects"]
                  }
                }
              },
              required: ["date", "notice", "schedule"]
            }
          }
        }
      });
      parsedData = JSON.parse(response.text || "[]");
    }
    parsedData = parsedData.map((item, idx) => ({
      id: item.id || `day-parsed-${Date.now()}-${idx}`,
      date: item.date || `10/${12 + idx}`,
      fullTitle: item.fullTitle || `2026\uD559\uB144\uB3C4 2\uD559\uAE30 1\uCC28 \uACE0\uC0AC \uC2DC\uAC04\uD45C(${item.date || `10/${12 + idx}`})`,
      notice: item.notice || FIXED_NOTICE,
      bottomNotice: item.bottomNotice || DEFAULT_BOTTOM_NOTICE,
      schedule: item.schedule || []
    }));
    return res.json({ success: true, data: parsedData });
  } catch (error) {
    console.error("Extraction Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "\uC2DC\uAC04\uD45C \uBB38\uC11C \uBD84\uC11D \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4."
    });
  }
});
app.post("/api/parse-roster", async (req, res) => {
  try {
    const { fileBase64, mimeType, extractedText, customApiKey } = req.body;
    if (!fileBase64 && !extractedText) {
      return res.status(400).json({ success: false, error: "\uBD84\uC11D\uD560 \uBA85\uB82C\uD45C \uD30C\uC77C\uC774\uB098 \uD14D\uC2A4\uD2B8 \uB370\uC774\uD130\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4." });
    }
    let resolvedKey = (customApiKey || "").trim();
    if (resolvedKey.startsWith("enc_")) {
      try {
        const b64 = resolvedKey.slice(4);
        const ciphered = decodeURIComponent(Buffer.from(b64, "base64").toString("utf-8"));
        const SALT = "AI_EXAM_SCHEDULE_SECURE_2026";
        let dec = "";
        for (let i = 0; i < ciphered.length; i++) {
          dec += String.fromCharCode(ciphered.charCodeAt(i) ^ SALT.charCodeAt(i % SALT.length));
        }
        resolvedKey = dec;
      } catch {
      }
    } else if (resolvedKey.startsWith("b64_")) {
      try {
        resolvedKey = Buffer.from(resolvedKey.slice(4), "base64").toString("utf-8");
      } catch {
      }
    }
    const geminiKey = resolvedKey || process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return res.status(400).json({
        success: false,
        error: "Gemini API \uD0A4\uAC00 \uC124\uC815\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4."
      });
    }
    const clientAI = new GoogleGenAI({
      apiKey: geminiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } }
    });
    const systemInstruction = `
\uB2F9\uC2E0\uC740 \uB300\uD55C\uBBFC\uAD6D \uACE0\uB4F1\uD559\uAD50\uC758 '\uC804\uAD50 \uD559\uC0DD \uBA85\uB82C\uD45C' \uB610\uB294 '\uD559\uAE09 \uC778\uC6D0 \uD604\uD669\uD45C' \uBB38\uC11C(PDF, \uC5D1\uC140, \uC774\uBBF8\uC9C0 \uB4F1)\uB97C \uBD84\uC11D\uD558\uC5EC \uAC01 \uD559\uB144\xB7\uBC18\uBCC4 \uCD1D \uD559\uC0DD \uC218(\uC7AC\uC801 \uC778\uC6D0)\uB97C \uC815\uD655\uD558\uAC8C \uC9D1\uACC4\uD558\uB294 \uB370\uC774\uD130 \uBD84\uC11D \uC804\uBB38\uAC00\uC785\uB2C8\uB2E4.

[\uBD84\uC11D \uBC0F \uC9D1\uACC4 \uADDC\uCE59]
1. \uBB38\uC11C \uC0C1\uB2E8 \uC81C\uBAA9(\uC608: "2026\uD559\uB144\uB3C4 2\uD559\uB144 \uC804\uCCB4 \uBA85\uB82C")\uC5D0\uC11C \uD559\uB144 \uC815\uBCF4\uB97C \uC815\uD655\uD788 \uD30C\uC545\uD558\uC2ED\uC2DC\uC624. ("2026\uD559\uB144\uB3C4"\uC758 \uC22B\uC790\uB97C \uD559\uB144\uC73C\uB85C \uD63C\uB3D9\uD558\uC9C0 \uB9C8\uC2ED\uC2DC\uC624.)
2. \uD45C \uD558\uB2E8\uC774\uB098 \uC0C1\uB2E8\uC5D0 \uAC01 \uBC18\uBCC4 '\uC778\uC6D0', '\uC7AC\uC801', '\uD604\uC6D0', '\uACC4', '\uC18C\uACC4', '\uD569\uACC4' \uD589(\uC608: "\uC778\uC6D0 22 | \uC778\uC6D0 22 | \uC778\uC6D0 23 ...")\uC774 \uBA85\uC2DC\uB418\uC5B4 \uC788\uB2E4\uBA74 \uBC18\uB4DC\uC2DC \uD574\uB2F9 \uC22B\uC790\uB97C \uCD5C\uC6B0\uC120\uC73C\uB85C \uADF8\uB300\uB85C \uCD94\uCD9C\uD558\uC2ED\uC2DC\uC624.
3. \uC6B0\uCE21 \uD558\uB2E8\uC758 "\uCD1D\uC6D0 : 184" \uAC19\uC740 \uD559\uB144 \uC804\uCCB4 \uD569\uACC4(\uCD1D\uC6D0/\uCD1D\uACC4)\uB97C \uB9C8\uC9C0\uB9C9 \uBC18(\uC608: 8\uBC18)\uC758 \uC778\uC6D0\uC73C\uB85C \uC798\uBABB \uCD94\uCD9C\uD558\uC9C0 \uB9C8\uC2ED\uC2DC\uC624.
4. \uB9CC\uC57D \uD559\uC0DD \uAC1C\uC778\uBCC4 \uBA85\uB2E8(\uBA85\uB82C\uD45C)\uC744 \uC9C1\uC811 \uC138\uC5B4\uC57C \uD55C\uB2E4\uBA74:
   - \uC591\uC2DD \uD558\uB2E8\uC5D0 25\uBC88~30\uBC88 \uB4F1 \uC774\uB984\uC774 \uBE44\uC5B4 \uC788\uB294 \uACF5\uB780 \uBC88\uD638\uB9CC \uC778\uC1C4\uB418\uC5B4 \uC788\uB294 \uACBD\uC6B0, \uC774\uB984\uC774 \uC5C6\uB294 \uBE48 \uBC88\uD638\uB294 \uC808\uB300 \uD559\uC0DD \uC218\uC5D0 \uD3EC\uD568\uD558\uC9C0 \uB9C8\uC2ED\uC2DC\uC624.
   - '\uC804\uCD9C', '\uC790\uD1F4', '\uD734\uD559', '\uC720\uC608', '\uBA74\uC81C', '\uC81C\uC801', '\uACB0\uBC88'\uC73C\uB85C \uD45C\uAE30\uB418\uC5B4 \uC774\uB984\uC774 \uC5C6\uB294 \uD589\uC740 \uD559\uC0DD \uC218\uC5D0\uC11C \uC81C\uC678\uD558\uC2ED\uC2DC\uC624. (\uB2E8, \uD559\uC0DD \uC774\uB984\uACFC \uD568\uAED8 '\uC804\uC785', '\uC704\uD0C1'\uC774 \uD45C\uAE30\uB41C \uC7AC\uC801\uC0DD\uC740 \uD3EC\uD568\uD569\uB2C8\uB2E4.)
   - \uD559\uBC88\uC774 5\uC790\uB9AC(\uC608: 10101 = 1\uD559\uB144 01\uBC18 01\uBC88) \uB610\uB294 4\uC790\uB9AC(\uC608: 1101 = 1\uD559\uB144 1\uBC18 01\uBC88)\uC778 \uACBD\uC6B0 \uD559\uBC88 \uCCB4\uACC4\uB97C \uBD84\uC11D\uD558\uC5EC \uD559\uB144\uACFC \uBC18\uC744 \uBD84\uB958\uD558\uACE0 \uAC01 \uBC18\uC758 \uC2E4\uC81C \uD559\uC0DD \uC218\uB97C \uC815\uD655\uD788 \uC138\uC2ED\uC2DC\uC624.
5. \uACB0\uACFC\uB294 \uBC18\uB4DC\uC2DC JSON \uAC1D\uCCB4 \uB0B4 'classes' \uBC30\uC5F4 \uBC0F 'maxClassNum'\uC73C\uB85C \uBC18\uD658\uD558\uC2ED\uC2DC\uC624.
`;
    const parts = [];
    const isPdf = mimeType && mimeType.includes("pdf") || fileBase64 && fileBase64.includes("application/pdf");
    if (extractedText && String(extractedText).trim().length > 20) {
      parts.push({
        text: `\uB2E4\uC74C\uC740 \uC5C5\uB85C\uB4DC\uB41C \uC804\uAD50 \uD559\uC0DD \uBA85\uB82C\uD45C/\uC778\uC6D0 \uD604\uD669 \uD30C\uC77C\uC5D0\uC11C \uCD94\uCD9C\uB41C \uB370\uC774\uD130\uC785\uB2C8\uB2E4:

${String(extractedText).slice(0, 8e4)}

\uC704 \uB370\uC774\uD130\uB97C \uC815\uBC00 \uBD84\uC11D\uD558\uC5EC \uD559\uB144\uBCC4\xB7\uBC18\uBCC4 \uCD1D\uC6D0(\uD559\uC0DD \uC218)\uC744 JSON\uC73C\uB85C \uCD94\uCD9C\uD574 \uC8FC\uC138\uC694.`
      });
    } else if (fileBase64) {
      const base64Data = fileBase64.replace(/^data:image\/\w+;base64,/, "").replace(/^data:application\/pdf;base64,/, "");
      const effectiveMimeType = isPdf ? "application/pdf" : mimeType || "image/jpeg";
      parts.push({ inlineData: { mimeType: effectiveMimeType, data: base64Data } });
      parts.push({
        text: `\uC774 \uC804\uAD50 \uD559\uC0DD \uBA85\uB82C\uD45C/\uD559\uAE09 \uC778\uC6D0 \uD604\uD669 \uBB38\uC11C\uB97C \uC815\uBC00 \uBD84\uC11D\uD558\uC5EC \uD559\uB144\uBCC4\xB7\uBC18\uBCC4 \uCD1D\uC6D0(\uD559\uC0DD \uC218)\uC744 JSON\uC73C\uB85C \uCD94\uCD9C\uD574 \uC8FC\uC138\uC694.`
      });
    }
    const modelsToTry = ["gemini-3-flash-preview", "gemini-2.5-flash", "gemini-3.8-flash"];
    let response = null;
    let lastErr = null;
    for (const modelName of modelsToTry) {
      try {
        response = await clientAI.models.generateContent({
          model: modelName,
          contents: { parts },
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            temperature: 0,
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                classes: {
                  type: Type.ARRAY,
                  description: "\uD559\uB144\uBCC4 \uBC18\uBCC4 \uD559\uC0DD \uCD1D\uC6D0 \uBAA9\uB85D",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      grade: { type: Type.STRING, description: '\uD559\uB144 \uC22B\uC790 \uBB38\uC790\uC5F4 ("1", "2", "3")' },
                      classNum: { type: Type.STRING, description: '\uBC18 \uC22B\uC790 \uBB38\uC790\uC5F4 ("1" ~ "15")' },
                      count: { type: Type.INTEGER, description: "\uD574\uB2F9 \uD559\uAE09 \uCD1D\uC6D0(\uD559\uC0DD \uC218)" }
                    },
                    required: ["grade", "classNum", "count"]
                  }
                },
                maxClassNum: {
                  type: Type.INTEGER,
                  description: "\uAC10\uC9C0\uB41C \uAC00\uC7A5 \uD070 \uBC18 \uBC88\uD638 (1~15)"
                }
              },
              required: ["classes", "maxClassNum"]
            }
          }
        });
        if (response?.text) break;
      } catch (err) {
        lastErr = err;
        if (err?.message?.includes("429") || err?.message?.includes("RESOURCE_EXHAUSTED")) {
          break;
        }
      }
    }
    if (!response && lastErr) {
      throw lastErr;
    }
    const parsed = JSON.parse(response?.text || '{"classes":[],"maxClassNum":0}');
    const classTotals = {};
    let maxClassFound = parsed.maxClassNum || 0;
    if (Array.isArray(parsed.classes)) {
      for (const item of parsed.classes) {
        const g = String(item.grade || "").replace(/[^1-3]/g, "");
        const c = String(item.classNum || "").replace(/[^0-9]/g, "");
        const cnt = Number(item.count);
        if (g && c && !isNaN(cnt) && cnt > 0) {
          classTotals[`${g}-${c}`] = String(cnt);
          const cNum = parseInt(c, 10);
          if (cNum > maxClassFound && cNum <= 15) {
            maxClassFound = cNum;
          }
        }
      }
    }
    return res.json({
      success: true,
      classTotals,
      maxClassFound,
      totalClassesCount: Object.keys(classTotals).length
    });
  } catch (error) {
    console.error("Roster Parsing Error:", error);
    const errMsg = String(error?.message || "");
    const isQuota = errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.toLowerCase().includes("quota");
    return res.status(isQuota ? 429 : 500).json({
      success: false,
      error: isQuota ? "Gemini API \uD638\uCD9C \uD560\uB2F9\uB7C9(Quota)\uC744 \uCD08\uACFC\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uAC70\uB098 \uC5D1\uC140(.xlsx, .xls, .csv) \uB610\uB294 \uD14D\uC2A4\uD2B8 PDF \uD615\uC2DD\uC73C\uB85C \uCCA8\uBD80\uD574 \uC8FC\uC138\uC694." : error.message || "\uBA85\uB82C\uD45C \uD30C\uC77C \uBD84\uC11D \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4."
    });
  }
});
async function startServer() {
  if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom"
    });
    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const indexPath = path.resolve(__dirname, "index.html");
        let rawHtml = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, "utf-8") : `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>\uACE0\uB4F1\uD559\uAD50 \uC2DC\uD5D8 \uC2DC\uAC04\uD45C AI \uBD84\uC11D\uAE30 & scheduleData \uC0DD\uC131\uAE30</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
        const template = await vite.transformIndexHtml(url, rawHtml);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  }
  app.listen(PORT, HOST, () => {
    console.log(`Server listening on http://${HOST}:${PORT}`);
  });
}
startServer();
