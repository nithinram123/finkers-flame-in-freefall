const groqDefault = 'openai/gpt-oss-20b';
const claudeDefault = 'claude-haiku-5-5';

export function askProvider(env) {
  const projectKey = env.nasaspaceapps?.trim();
  const groqKey = env.GROQ_API_KEY?.trim() || (projectKey?.startsWith('gsk_') ? projectKey : null);
  if (groqKey) {
    return { name: 'GroqCloud', key: groqKey, model: env.GROQ_MODEL?.trim() || groqDefault };
  }
  const claudeKey = env.NASASpaceAppAPIKey?.trim() || env.ANTHROPIC_API_KEY?.trim();
  if (!claudeKey) return null;
  return { name: 'Anthropic', key: claudeKey, model: env.ANTHROPIC_MODEL?.trim() || claudeDefault };
}

export function requestAnswer({ name, key, model }, system, content, schema) {
  const request = {
    method: 'POST',
    signal: AbortSignal.timeout(17000),
    headers: { 'Content-Type': 'application/json' },
  };
  const user = { role: 'user', content };
  if (name === 'GroqCloud') {
    const isGptOss = model === groqDefault || model === 'openai/gpt-oss-120b';
    return fetch('https://api.groq.com/openai/v1/chat/completions', {
      ...request,
      headers: { ...request.headers, Authorization: 'Bearer ' + key },
      body: JSON.stringify({
        model,
        max_completion_tokens: 1200,
        ...(isGptOss ? { reasoning_effort: 'low' } : {}),
        messages: [{ role: 'system', content: system }, user],
        response_format: isGptOss
          ? { type: 'json_schema', json_schema: { name: 'psi_answer', strict: true, schema } }
          : { type: 'json_object' },
      }),
    });
  }
  return fetch('https://api.anthropic.com/v1/messages', {
    ...request,
    headers: { ...request.headers, 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model,
      max_tokens: 900,
      ...(model === claudeDefault
        ? { output_config: { effort: 'low', format: { type: 'json_schema', schema } } }
        : {}),
      system,
      messages: [user],
    }),
  });
}

export function readProviderAnswer(name, result) {
  if (name === 'GroqCloud') {
    const choice = result.choices?.[0];
    return {
      incomplete: choice?.finish_reason !== 'stop' || Boolean(choice.message?.refusal),
      content: choice?.message?.content,
    };
  }
  return {
    incomplete: ['refusal', 'max_tokens'].includes(result.stop_reason),
    content: (result.content ?? [])
      .filter(({ type }) => type === 'text')
      .map(({ text }) => text)
      .join(''),
  };
}
