// Fretlab「AI先生」API（Cloudflare Workers）
//   POST /character  希望から先生キャラクターを作る（JSON を返す）
//   POST /chat       先生キャラとして返事をする（テキストを少しずつ流す）
// Anthropic の API キーはこのサーバーの secret（ANTHROPIC_API_KEY）にだけ置き、アプリには渡さない。
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

interface Env {
  ANTHROPIC_API_KEY: string;
  ALLOWED_ORIGINS: string;
  LIMITER?: { limit(opts: { key: string }): Promise<{ success: boolean }> };
}

const MODEL = "claude-opus-5-5";

const CharacterSchema = z.object({
  name: z.string().describe("先生の名前（日本語、2〜8文字程度）"),
  symbol: z.string().describe("アイコンに表示する1文字（漢字・ひらがな・英字のいずれか）"),
  catchphrase: z.string().describe("口癖やひとことキャッチコピー（30文字以内）"),
  personality: z.string().describe("性格と教え方の特徴（80文字以内）"),
  speaking_style: z.string().describe("口調の具体的な説明。語尾や一人称を含める（60文字以内）"),
  specialty: z.string().describe("得意なジャンルや分野（40文字以内）"),
  greeting: z.string().describe("その口調で書いた、生徒への最初のあいさつ（120文字以内）"),
});
type Character = z.infer<typeof CharacterSchema>;

const ChatBody = z.object({
  character: CharacterSchema,
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(2000) }))
    .min(1)
    .max(30),
  context: z
    .object({
      streak: z.number().int().min(0).max(10000).optional(),
      week_minutes: z.number().int().min(0).max(100000).optional(),
      recent: z.array(z.string().max(40)).max(10).optional(),
      instrument: z.string().max(20).optional(),
    })
    .optional(),
});

const CharacterBody = z.object({
  preset: z.string().max(40).optional(),
  wish: z.string().max(400).optional(),
});

const APP_GUIDE = `あなたはギター練習アプリ「Fretlab」に住んでいる先生キャラクターです。
アプリには次の機能があります。必要なときだけ、具体的にどの画面で何をすればよいかを案内してください。
- メトロノーム：BPM 30〜260、クリック音色10種、ドラムパターン15種（8ビート、シャッフル、ボサノヴァなど）、数小節ごとにテンポを上げるスピードトレーナー
- チューナー：ギター・ベース4弦/5弦・ウクレレ。マイクで音程を測る
- コード一覧：12ルート×17タイプ、押さえ方を横向きのダイアグラムで表示
- コード進行：定番100パターン（カノン進行、王道進行、丸サ進行、12小節ブルースなど）をドラムと伴奏つきで再生
- 指板音程表（音名・度数表示、指板クイズ）、スケール表（13スケール）
- 練習記録（タイマー、14日間のグラフ、連続練習日数）、練習Tips`;

function systemPrompt(c: Character, ctx?: z.infer<typeof ChatBody>["context"]): string {
  const lines = [
    APP_GUIDE,
    "",
    "## あなたのキャラクター",
    `名前：${c.name}`,
    `口癖：${c.catchphrase}`,
    `性格と教え方：${c.personality}`,
    `口調：${c.speaking_style}`,
    `得意分野：${c.specialty}`,
    "",
    "## 話し方のルール",
    "- いつもこのキャラクターの口調で、日本語で話してください。",
    "- 返事はスマホで読みやすい長さにします。ふだんは3〜6文。練習メニューなど手順を伝えるときだけ、短い箇条書きを使います。",
    "- 練習のアドバイスは、BPM・時間・回数など具体的な数字を入れて、今日からできる形にします。",
    "- 痛みやしびれが続く相談には、無理をせず休むこと、続くときは医師に相談することを勧めます。",
    "- 音楽やギター練習と関係のない話題は、キャラクターらしく軽く受け止めてから練習の話に戻します。",
  ];
  if (ctx && (ctx.streak !== undefined || ctx.week_minutes !== undefined || ctx.recent?.length || ctx.instrument)) {
    lines.push("", "## 生徒の練習状況（アプリの記録より。話題に合うときだけ触れる）");
    if (ctx.streak !== undefined) lines.push(`連続練習：${ctx.streak}日`);
    if (ctx.week_minutes !== undefined) lines.push(`直近7日の練習時間：${ctx.week_minutes}分`);
    if (ctx.recent?.length) lines.push(`最近の練習内容：${ctx.recent.join("、")}`);
    if (ctx.instrument) lines.push(`チューナーで選んでいる楽器：${ctx.instrument}`);
  }
  return lines.join("\n");
}

function cors(origin: string | null, env: Env): Record<string, string> {
  const allowed = env.ALLOWED_ORIGINS.split(",").map((s) => s.trim());
  const ok = origin !== null && allowed.includes(origin);
  return {
    "Access-Control-Allow-Origin": ok ? origin : allowed[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(data: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...headers, "Content-Type": "application/json; charset=utf-8" } });
}

async function makeCharacter(client: Anthropic, body: z.infer<typeof CharacterBody>): Promise<Character | null> {
  const wish = [body.preset ? `タイプ：${body.preset}` : "", body.wish ? `希望：${body.wish}` : ""].filter(Boolean).join("\n") || "おまかせ";
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 4000,
    output_config: { effort: "low", format: zodOutputFormat(CharacterSchema) },
    system:
      "ギター練習アプリの先生キャラクターを1人作ってください。生徒の希望に合わせ、親しみやすく個性のある人物にします。実在の人物や既存作品のキャラクターは使わず、オリジナルにしてください。",
    messages: [{ role: "user", content: wish }],
  });
  if (response.stop_reason === "refusal") return null;
  return response.parsed_output ?? null;
}

async function chat(client: Anthropic, body: z.infer<typeof ChatBody>, headers: Record<string, string>): Promise<Response> {
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const enc = new TextEncoder();
  (async () => {
    let wrote = false;
    try {
      const stream = client.beta.messages.stream({
        model: MODEL,
        max_tokens: 4000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "low" },
        system: systemPrompt(body.character, body.context),
        messages: body.messages,
      } as Parameters<typeof client.beta.messages.stream>[0]);
      stream.on("text", (delta) => {
        wrote = true;
        writer.write(enc.encode(delta));
      });
      const final = await stream.finalMessage();
      if (final.stop_reason === "refusal" && !wrote) {
        await writer.write(enc.encode("ごめんね、その話題にはうまく答えられないんだ。練習のことなら何でも聞いてね。"));
      }
    } catch (e) {
      console.error(e);
      await writer.write(enc.encode(wrote ? "\n（通信が途中で切れました。もう一度送ってください）" : "（先生が少し休憩中です。時間をおいてもう一度送ってください）"));
    } finally {
      await writer.close();
    }
  })();
  return new Response(readable, { headers: { ...headers, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = req.headers.get("Origin");
    const headers = cors(origin, env);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (req.method !== "POST") return json({ error: "POST only" }, 405, headers);
    const allowed = env.ALLOWED_ORIGINS.split(",").map((s) => s.trim());
    if (!origin || !allowed.includes(origin)) return json({ error: "origin not allowed" }, 403, headers);
    if (env.LIMITER) {
      const ip = req.headers.get("CF-Connecting-IP") ?? "unknown";
      const { success } = await env.LIMITER.limit({ key: ip });
      if (!success) return json({ error: "too many requests" }, 429, headers);
    }
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return json({ error: "invalid json" }, 400, headers);
    }
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    const path = new URL(req.url).pathname;
    if (path === "/character") {
      const body = CharacterBody.safeParse(raw);
      if (!body.success) return json({ error: "invalid body" }, 400, headers);
      try {
        const c = await makeCharacter(client, body.data);
        return c ? json({ character: c }, 200, headers) : json({ error: "could not create" }, 422, headers);
      } catch (e) {
        console.error(e);
        return json({ error: "upstream error" }, 502, headers);
      }
    }
    if (path === "/chat") {
      const body = ChatBody.safeParse(raw);
      if (!body.success) return json({ error: "invalid body" }, 400, headers);
      if (body.data.messages[0].role !== "user" || body.data.messages.at(-1)?.role !== "user") return json({ error: "invalid messages" }, 400, headers);
      return chat(client, body.data, headers);
    }
    return json({ error: "not found" }, 404, headers);
  },
};
