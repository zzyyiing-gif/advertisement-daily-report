import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// API routes first
app.get("/api/news", (req, res) => {
  res.json([
    {
      id: "n1",
      title: "Google Ads 推出 PMax \"Power Up\" 工具：AI 自动生成高保真素材",
      source: "Google Marketing Live",
      time: "3小时前",
      summary: "新的 Power Up 功能允许广告主通过简单的文本指令，自动生成符合品牌调性的 4K 视频和场景图素材，并支持实时 A/B 测试。",
      tags: ["Google Ads", "PMax", "GenAI"],
      impact: "素材制作成本降低 85%，复杂创意的上线周期从数周缩短至数分钟。",
      suggestion: "建议在非核心地区先测试 AI 生成的视频素材，对比其与实拍素材的转化差异。",
      url: "https://blog.google/products/ads-commerce/"
    },
    {
      id: "n2",
      title: "Meta Advantage+ 升级：自适应创意支持实时背景模拟",
      source: "Social Media Today",
      time: "6小时前",
      summary: "Meta 宣布 Advantage+ 创意套件现在可以根据用户的地理位置和天气，实时为产品图片生成匹配的背景，如在雨天展示室内温馨场景。",
      tags: ["Meta Ads", "智能创意", "AdTech"],
      impact: "初步测试显示，动态背景使点击率 (CTR) 平均提升了 22%。",
      suggestion: "针对季节性明显的商品，开启“自适应背景”开关，让算法自动根据环境压力调整视觉效果。",
      url: "https://www.socialmediatoday.com/"
    },
    {
      id: "n3",
      title: "隐私沙盒 (Privacy Sandbox) 全面生效：广告商需转向 Protected Audience API",
      source: "AdExchanger",
      time: "12小时前",
      summary: "随着 Chrome 彻底移除第三方 Cookie，旧有的再营销逻辑正式失效，广告平台正在强制迁移至隐私合规的聚合测量方案。",
      tags: ["隐私合规", "Tracking", "测量"],
      impact: "精准再营销成本 (CPA) 预计上升 10-15%，数据归归存在 24-48 小时延迟。",
      suggestion: "必须完成 CAPI (Conversion API) 的深度部署，以确保转化数据的准确回传。",
      url: "https://www.adexchanger.com/"
    }
  ]);
});

app.get("/api/ai-updates", (req, res) => {
  res.json([
    {
      id: "ai1",
      title: "OpenAI Sora 进入创意机构预览：广告短片制作逻辑重构",
      source: "OpenAI",
      time: "8小时前",
      summary: "Sora 现支持生成长达 60 秒的物理一致性视频，多家 4A 公司已将其引入前期分镜 (Storyboard) 和低成本投放素材中。",
      highlights: ["视频生成", "极客创意", "低成本"],
      useCase: "快速生成不同风格的测试素材，寻找最能击中用户痛点的视觉表现形式。",
      recommendation: "尝试利用 Sora 生成具有冲击力的片头，结合实拍产品图，打造混合现实感的广告。",
      url: "https://openai.com/sora"
    },
    {
      id: "ai2",
      title: "Gemini 2.0 推出原生“Agentic”模式：支持跨文件多维分析",
      source: "Google DeepMind",
      time: "1天前",
      summary: "Gemini 2.0 能够自主执行复杂的数据清理、多重关联分析并自动完成 PPT 摘要，不再局限于简单的问答。",
      highlights: ["原生代理", "2M 上下文", "自主推理"],
      useCase: "将一年的广告原始日志直接喂给模型，让其自动寻找季节性波动与素材表现的隐藏关联。",
      recommendation: "在定期报表分析中引入 Gemini Agent，替代人工进行基础的数据交叉校验。",
      url: "https://deepmind.google/technologies/gemini/"
    },
    {
      id: "ai3",
      title: "Claude 3.5 Sonnet：成为广告自动化脚本编写的“黄金标准”",
      source: "Anthropic",
      time: "2天前",
      summary: "由于其极高的代码准确性和对复杂逻辑的理解，Claude 3.5 成为优化师编写 Google Ads Scripts 和 Meta API 接口的最常用工具。",
      highlights: ["代码一致性", "复杂逻辑", "准确度"],
      useCase: "自动编写复杂的预警脚本，或对多语言广告语进行带有文化背景的精准语义核查。",
      recommendation: "利用 Claude 对现有的自动化预警逻辑进行一轮优化，降低误报率。",
      url: "https://www.anthropic.com/news/"
    }
  ]);
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", mode: process.env.NODE_ENV, vercel: !!process.env.VERCEL });
});

// Main async start function
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development mode with Vite
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    // Production mode for non-Vercel (e.g. Docker/Cloud Run)
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
}

// Start server
startServer();

// Export for Vercel
export default app;

// Listen if not on Vercel
if (!process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}
