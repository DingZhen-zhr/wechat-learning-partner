const cloud = require("wx-server-sdk");
const https = require("https");
const tencentcloud = require("tencentcloud-sdk-nodejs");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

// DeepSeek API Config
// 注意：请在云开发控制台 -> 云函数 -> studyPlanAI -> 配置 -> 环境变量 中设置 DEEPSEEK_API_KEY
// 如果你只是想临时测试，可以将 process.env.DEEPSEEK_API_KEY 替换为你的真实 Key 字符串，例如 "sk-xxxxxxxx"
// 但强烈建议使用环境变量，安全性更高。
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY; 

// Tencent Cloud ASR Config
const TENCENT_SECRET_ID = process.env.TENCENT_SECRET_ID; 
const TENCENT_SECRET_KEY = process.env.TENCENT_SECRET_KEY; 

exports.main = async (event, context) => {
  const { type } = event;

  try {
    if (type === "chat") {
      return await handleChat(event.messages);
    } else if (type === "speechToText") {
      return await handleSpeechToText(event.audioData, event.format || "mp3");
    } else {
      return { success: false, msg: "Unknown type" };
    }
  } catch (err) {
    console.error("Cloud Function Error:", err);
    return { success: false, msg: err.message, error: err };
  }
};

// Handle DeepSeek Chat
function handleChat(messages) {
  return new Promise((resolve, reject) => {
    // 检查 API Key
    if (!DEEPSEEK_API_KEY) {
      // 如果环境变量未设置，尝试使用一个占位符报错，提示用户
      reject(new Error("未配置 DeepSeek API Key。请在云函数环境变量中添加 DEEPSEEK_API_KEY。"));
      return;
    }

    const data = JSON.stringify({
      model: "deepseek-chat", // 使用 deepseek-chat 模型
      messages: messages,
      stream: false,
    });

    const options = {
      hostname: "api.deepseek.com",
      path: "/chat/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(body);
          resolve({ success: true, data: json });
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on("error", (e) => reject(e));
    req.write(data);
    req.end();
  });
}

// Handle Tencent Cloud ASR
async function handleSpeechToText(audioData, format) {
  if (!TENCENT_SECRET_ID || !TENCENT_SECRET_KEY) {
    // 如果没有配置腾讯云密钥，返回特定错误，前端可以据此提示
    throw new Error("Missing Tencent Cloud credentials (TENCENT_SECRET_ID/KEY)");
  }

  const AsrClient = tencentcloud.asr.v20190614.Client;
  const clientConfig = {
    credential: {
      secretId: TENCENT_SECRET_ID,
      secretKey: TENCENT_SECRET_KEY,
    },
    region: "",
    profile: {
      httpProfile: {
        endpoint: "asr.tencentcloudapi.com",
      },
    },
  };

  const client = new AsrClient(clientConfig);
  const params = {
    EngineModelType: "16k_zh",
    ChannelNum: 1,
    ResTextFormat: 0,
    SourceType: 1, // 1: base64
    Data: audioData, // Expecting base64 string
    DataLen: audioData.length,
  };

  return new Promise((resolve, reject) => {
    client.SentenceRecognition(params, (err, response) => {
      if (err) {
        reject(err);
        return;
      }
      resolve({ success: true, text: response.Result });
    });
  });
}