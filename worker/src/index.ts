// Fretlab「レッスンコーチ（AI先生）」API（Cloudflare Workers）
//   POST /ask   ギターの質問に AI先生 が答える（テキストを少しずつ流す）
// Anthropic の API キーはこのサーバーの secret（ANTHROPIC_API_KEY）にだけ置き、アプリには渡さない。
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

interface Env {
  ANTHROPIC_API_KEY: string;
  ALLOWED_ORIGINS: string;
  LIMITER?: { limit(opts: { key: string }): Promise<{ success: boolean }> };
}

const MODEL = "claude-opus-5-5";

const AskBody = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(4000) }))
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

// 毎回同じ文面（キャッシュが効くように、日時や生徒ごとの情報は入れない）
const SYSTEM = `あなたはギター練習アプリ「Fretlab」の「AI先生」です。ギター講師として、生徒の質問に的確に答えます。

## 答え方
- 質問にまず結論から答え、そのあと理由と具体的なやり方を書きます。
- 正確さを最優先します。コードの構成音、度数、フレット位置、指番号、スケールの音、機材の仕組みなどの事実は、確かなことだけを書きます。自信がないことは推測で断定せず、「〜の場合が多い」「確認するなら〜」と伝えます。
- コードの押さえ方は「6弦→1弦」の順にフレット番号で書きます（例：C = x32010、x はミュート、0 は開放弦）。指番号は 1=人差し指、2=中指、3=薬指、4=小指。
- フレーズを示すときは短い TAB 譜を使ってかまいません（コードブロック内、e|B|G|D|A|E の6行）。
- 練習方法は、BPM・時間・回数など具体的な数字を入れて、今日からできる形にします。
- 長さはスマホで読みやすい程度にします。簡単な質問は短く、手順が必要な質問だけ見出しや箇条書きを使います。Markdown は **太字**、箇条書き、番号付きリスト、### 見出し、コードブロックだけを使います（表は使いません）。
- 生徒の悩みに寄り添い、丁寧で親しみやすい「です・ます」調で話します。
- 痛みやしびれが続く相談には、無理をせず休むこと、続くときは医師に相談することを勧めます。
- ギターや音楽と関係のない質問には、ギターの先生として答えられる範囲ではないことを短く伝え、練習の話に戻します。
- 著作権のある曲の歌詞や楽譜をそのまま書き写すことはしません。コード進行の一般的な説明や練習のコツは答えてかまいません。

## アプリの機能（役立つときだけ、どの画面で何をするか案内します）
- メトロノーム：BPM 30〜260、クリック音色10種、ドラムパターン15種（8ビート、シャッフル、ボサノヴァなど）
- チューナー：クロマチック・ギター・ベース4弦/5弦・ウクレレ。針のメーターで表示
- コード：12ルート×17タイプ。押さえ方を横向きのダイアグラムで、0〜12フレットのポジション別に表示
- 進行：定番100パターン（カノン進行、王道進行、丸サ進行、12小節ブルースなど）をドラムと伴奏つきで再生
- 指板（音名・度数表示、指板クイズ）、スケール（13スケール）
- 練習曲：著作権の切れた曲のコード譜をメロディつきで再生、キー変更・カポ表示
- TAB：有名なメロディやリフを TAB 譜で再生
- マイ記録：ポモドーロ式タイマーで練習時間を記録、録音
- ヒント：練習のコツとギター豆知識`;

function contextNote(ctx?: z.infer<typeof AskBody>["context"]): string | null {
  if (!ctx) return null;
  const lines: string[] = [];
  if (ctx.streak !== undefined) lines.push(`連続練習：${ctx.streak}日`);
  if (ctx.week_minutes !== undefined) lines.push(`直近7日の練習時間：${ctx.week_minutes}分`);
  if (ctx.recent?.length) lines.push(`最近の練習内容：${ctx.recent.join("、")}`);
  if (ctx.instrument) lines.push(`チューナーで選んでいる楽器：${ctx.instrument}`);
  return lines.length ? `## 生徒の練習状況（アプリの記録より。話題に合うときだけ触れる）\n${lines.join("\n")}` : null;
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

async function ask(client: Anthropic, body: z.infer<typeof AskBody>, headers: Record<string, string>): Promise<Response> {
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const enc = new TextEncoder();
  const note = contextNote(body.context);
  (async () => {
    let wrote = false;
    try {
      const stream = client.beta.messages.stream({
        model: MODEL,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        // 的確さを優先して medium（質問によって考える量は自動で調整される）
        output_config: { effort: "medium" },
        system: [
          { type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } },
          ...(note ? [{ type: "text" as const, text: note }] : []),
        ],
        messages: body.messages,
      } as Parameters<typeof client.beta.messages.stream>[0]);
      stream.on("text", (delta) => {
        wrote = true;
        writer.write(enc.encode(delta));
      });
      const final = await stream.finalMessage();
      if (final.stop_reason === "refusal" && !wrote) {
        await writer.write(enc.encode("ごめんなさい、その質問にはお答えできません。ギターや練習のことなら何でも聞いてください。"));
      } else if (final.stop_reason === "max_tokens") {
        await writer.write(enc.encode("\n\n（長くなったのでここで区切ります。「続きを」と送ってください）"));
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
    const path = new URL(req.url).pathname;
    if (path === "/ask") {
      const body = AskBody.safeParse(raw);
      if (!body.success) return json({ error: "invalid body" }, 400, headers);
      if (body.data.messages[0].role !== "user" || body.data.messages.at(-1)?.role !== "user") return json({ error: "invalid messages" }, 400, headers);
      return ask(new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }), body.data, headers);
    }
    return json({ error: "not found" }, 404, headers);
  },
};
