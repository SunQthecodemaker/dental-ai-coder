// Cloudflare Worker - Notion + AI 분류 프록시
// https://workers.cloudflare.com 에서 새 Worker 만들고 이 코드 붙여넣기

const NOTION_TOKEN = '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';
const DATABASE_ID = '337f3e715c448015b711cdb3e15b3416';
// ANTHROPIC_API_KEY는 Cloudflare Worker 환경변수(Secrets)에서 설정 (선택)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/api/classify') {
      return handleClassify(request, env);
    }

    if (request.method === 'POST' && url.pathname === '/api/notion') {
      return handleNotion(request, env);
    }

    return new Response('Not found', { status: 404 });
  }
};

// ── AI 분류 ──────────────────────────────────────
async function handleClassify(request, env) {
  const { text } = await request.json();
  if (!text) return json({ error: '텍스트가 필요합니다.' }, 400);

  const apiKey = env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return json(keywordClassify(text));
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `다음 메모를 분석해서 JSON만 출력해줘. 다른 텍스트 없이 JSON만.

메모: "${text}"

{"title":"10자 이내 제목","category":"할일/일정/아이디어/쇼핑/연락/메모 중 하나","summary":"1-2문장 요약"}`
        }]
      })
    });

    const data = await res.json();
    const content = data.content?.[0]?.text?.trim() || '';
    const match = content.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : content);

    return json({
      title: parsed.title || text.slice(0, 20),
      category: parsed.category || '메모',
      summary: parsed.summary || text
    });
  } catch {
    return json(keywordClassify(text));
  }
}

// ── Notion 저장 ──────────────────────────────────
async function handleNotion(request, env) {
  const { title, category, content, status } = await request.json();
  if (!title) return json({ error: '제목이 필요합니다.' }, 400);

  const token = env.NOTION_TOKEN || NOTION_TOKEN;
  const dbId = env.NOTION_DATABASE_ID || DATABASE_ID;

  const res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify({
      parent: { database_id: dbId },
      properties: {
        '제목': { title: [{ text: { content: title } }] },
        '분류': { select: { name: category || '기타' } },
        '내용': { rich_text: [{ text: { content: content || '' } }] },
        '날짜': { date: { start: new Date().toISOString().split('T')[0] } },
        '상태': { select: { name: status || '신규' } },
      }
    })
  });

  const data = await res.json();
  if (!res.ok) return json({ error: data.message || '저장 실패' }, res.status);
  return json({ success: true, id: data.id });
}

// ── 유틸 ─────────────────────────────────────────
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' }
  });
}

function keywordClassify(text) {
  const t = text;
  let category = '메모';
  if (/해야|하기|할것|처리|완료|끝내|마무리|제출|보내|수정|확인해/.test(t)) category = '할일';
  else if (/시|분|날|일정|약속|미팅|회의|방문|예약|언제|다음주|오늘|내일|모레/.test(t)) category = '일정';
  else if (/아이디어|생각|기획|개선|제안|어떨까|만들면/.test(t)) category = '아이디어';
  else if (/사야|구매|주문|장보기|쇼핑|필요한|사다/.test(t)) category = '쇼핑';
  else if (/전화|문자|연락|답장|카톡|메시지/.test(t)) category = '연락';
  return {
    title: text.length > 20 ? text.slice(0, 20) + '...' : text,
    category,
    summary: text
  };
}
