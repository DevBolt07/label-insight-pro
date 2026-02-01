
export async function callGeminiWithFallback(body: any, context: string, apiKey: string): Promise<{ result: any; usedModel: string }> {
    // Fallback Chain: Standard -> Lite -> Newer/Larger
    const MODELS = [
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
        "gemini-3-flash"
    ];

    let lastError: any = null;

    for (const model of MODELS) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            console.log(`[Gemini] Trying model: ${model} (Context: ${context})`);

            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                console.log(`[Gemini] Using model: ${model} (Context: ${context})`);
                const json = await res.json();
                return { result: json, usedModel: model };
            }

            // Handle Errors
            const rawText = await res.text();
            let errJson;
            try { errJson = JSON.parse(rawText); } catch { errJson = { error: { message: rawText } }; }

            const status = res.status;
            const errMsg = errJson.error?.message || rawText;

            // Rate limit checks
            // 429: Too Many Requests
            // 503: Service Unavailable (sometimes used for overload)
            // code 429 in body
            // status "RESOURCE_EXHAUSTED"
            const isRateLimit =
                status === 429 ||
                status === 503 ||
                (errJson.error && errJson.error.code === 429) ||
                (errJson.error && errJson.error.status === "RESOURCE_EXHAUSTED");

            if (isRateLimit) {
                console.warn(`[Gemini] Rate limited on ${model} (Status: ${status}), trying next model...`);
                lastError = new Error(`Rate limit exceeded on ${model}`);
                // Proceed to next model in loop
                continue;
            } else {
                // Fatal error (e.g. 400 Bad Request, Authentication, etc.)
                console.error(`[Gemini] Fatal Error on ${model}: ${errMsg}`);
                throw new Error(`Gemini Error ${status}: ${errMsg}`);
            }

        } catch (e: any) {
            // If we just threw a clean Gemini Error, rethrow it
            if (e.message && e.message.startsWith("Gemini Error")) throw e;

            // If it looks like a rate limit (from our Loop logic), we continue
            if (e.message && e.message.includes("Rate limit")) {
                lastError = e;
                continue;
            }

            // Network errors etc - treat as retriable or fatal?
            // Requirement: "Switch models only when error clearly indicates rate limit"
            // But we must NOT switch for auth/malformed.
            // If it's a fetch error (network), we might want to retry, but for now let's assume if it's not an explicit rate limit from API, we fail.
            // However, usually fetch throws TypeError for network issues.
            // Let's implement strict check based on requirements: ONLY retry rate/quota.
            // If we are here, it means it wasn't caught by the `isRateLimit` block above, OR it was a network throw.
            // If network throw, e.message might not contain "Rate limit".

            // Let's assume non-rate-limit errors are fatal to be safe, unless explicitly matched.
            console.error(`[Gemini] Unexpected error on ${model}:`, e);
            throw e;
        }
    }

    // If we exhaust all models
    throw new Error("All Gemini models failed due to rate limits.");
}
