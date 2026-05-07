import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { image_base64, mime_type } = await req.json()

    if (!image_base64) {
      return new Response(JSON.stringify({ error: 'image_base64 required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')

    let result

    if (openaiKey) {
      result = await identifyWithOpenAI(image_base64, mime_type ?? 'image/jpeg', openaiKey)
    } else if (anthropicKey) {
      result = await identifyWithClaude(image_base64, mime_type ?? 'image/jpeg', anthropicKey)
    } else {
      return new Response(
        JSON.stringify({ error: 'No AI API key configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

const SYSTEM_PROMPT = `You are a professional mineralogist and gemologist AI assistant. 
Analyze the provided image and identify the mineral/crystal specimen.
Return ONLY valid JSON with this exact structure:
{
  "confidence": 0.0-1.0,
  "model": "gpt-4o",
  "top_candidates": [
    {
      "mineral_name": "string",
      "mineral_group": "string",
      "confidence": 0.0-1.0,
      "description": "string",
      "distinguishing_features": ["string"],
      "similar_minerals": ["string"]
    }
  ],
  "disambiguation_questions": [
    {
      "id": "q1",
      "question": "string",
      "options": ["string"]
    }
  ]
}
Provide exactly 3 top candidates ordered by confidence. Include 2 disambiguation questions to help narrow the ID.`

async function identifyWithOpenAI(imageBase64: string, mimeType: string, apiKey: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: SYSTEM_PROMPT },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: 'high' } },
        ],
      }],
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`OpenAI error: ${err}`)
  }

  const data = await response.json()
  const content = data.choices[0].message.content
  return JSON.parse(content)
}

async function identifyWithClaude(imageBase64: string, mimeType: string, apiKey: string) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType, data: imageBase64 },
          },
          { type: 'text', text: SYSTEM_PROMPT.replace('gpt-4o', 'claude-3-5-sonnet') },
        ],
      }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Anthropic error: ${err}`)
  }

  const data = await response.json()
  const content = data.content[0].text
  return JSON.parse(content)
}
