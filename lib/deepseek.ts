const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";
const MODEL = "deepseek-v4-flash";

interface DeepSeekMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface DeepSeekStreamOptions {
  messages: DeepSeekMessage[];
  temperature?: number;
  maxTokens?: number;
  onToken: (token: string) => void;
  onDone: (fullContent: string) => void;
  onError: (error: Error) => void;
  signal?: AbortSignal;
}

/**
 * Stream a completion from DeepSeek API.
 * Calls onToken for each chunk, onDone when complete.
 */
export async function streamDeepSeek(options: DeepSeekStreamOptions) {
  const { messages, temperature = 0.7, maxTokens = 4096, onToken, onDone, onError, signal } = options;

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey === "your_deepseek_api_key_here") {
    onError(new Error("DEEPSEEK_API_KEY 未配置，请在 .env 中设置"));
    return;
  }

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
      }),
      signal,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "Unknown error");
      throw new Error(`DeepSeek API error ${response.status}: ${errText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("Response body is null");

    const decoder = new TextDecoder();
    let fullContent = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            fullContent += delta;
            onToken(delta);
          }
        } catch {
          // Skip unparseable lines
        }
      }
    }

    onDone(fullContent);
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") return;
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}

/**
 * Non-streaming call to DeepSeek — returns the full response.
 */
export async function callDeepSeek(
  messages: DeepSeekMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey === "your_deepseek_api_key_here") {
    throw new Error("DEEPSEEK_API_KEY 未配置，请在 .env 中设置");
  }

  const response = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 4096,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "Unknown error");
    throw new Error(`DeepSeek API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}
