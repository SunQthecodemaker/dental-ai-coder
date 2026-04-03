// Vercel 서버리스 함수 - Claude AI 분류
import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: '텍스트가 필요합니다.' });
  }

  // Claude API 키가 없으면 키워드 기반 분류 fallback
  if (!process.env.ANTHROPIC_API_KEY) {
    const result = keywordClassify(text);
    return res.status(200).json(result);
  }

  try {
    const client = new Anthropic();

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `다음 메모를 분석해서 JSON으로 응답해줘. 반드시 JSON만 출력하고 다른 텍스트는 없어야 해.

메모: "${text}"

응답 형식:
{
  "title": "핵심 내용을 10자 이내로 요약한 제목",
  "category": "할일/일정/아이디어/메모/쇼핑/연락 중 하나",
  "summary": "내용을 1-2문장으로 요약"
}

분류 기준:
- 할일: ~해야 함, ~하기, ~할 것, 처리, 완료 등 행동이 필요한 것
- 일정: 날짜/시간/약속/미팅/회의/방문 등 시간과 관련된 것
- 아이디어: 생각, 기획, 아이디어, 개선, 제안 등 창의적 내용
- 쇼핑: 구매, 사기, 주문, 장보기 등 구매 관련
- 연락: 전화, 문자, 연락, 답장 등 커뮤니케이션 관련
- 메모: 위 어느 것도 아닌 일반 메모`
        }
      ]
    });

    const responseText = message.content[0].text.trim();

    // JSON 파싱
    let parsed;
    try {
      // JSON 블록이 있으면 추출
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
    } catch {
      // JSON 파싱 실패시 키워드 fallback
      return res.status(200).json(keywordClassify(text));
    }

    return res.status(200).json({
      title: parsed.title || text.slice(0, 20),
      category: parsed.category || '메모',
      summary: parsed.summary || text
    });

  } catch (err) {
    // API 오류시 키워드 fallback
    console.error('Claude API 오류:', err.message);
    return res.status(200).json(keywordClassify(text));
  }
}

function keywordClassify(text) {
  const t = text.toLowerCase();
  let category = '메모';

  if (/해야|하기|할것|처리|완료|끝내|마무리|제출|보내|수정|확인해/.test(t)) {
    category = '할일';
  } else if (/시|분|날|일정|약속|미팅|회의|방문|예약|언제|다음주|오늘|내일|모레/.test(t)) {
    category = '일정';
  } else if (/아이디어|생각|기획|개선|제안|어떨까|하면어떨까|만들면/.test(t)) {
    category = '아이디어';
  } else if (/사야|구매|주문|장보기|쇼핑|필요한|사다|사기/.test(t)) {
    category = '쇼핑';
  } else if (/전화|문자|연락|답장|카톡|메시지|물어|알려/.test(t)) {
    category = '연락';
  }

  const title = text.length > 20 ? text.slice(0, 20) + '...' : text;

  return { title, category, summary: text };
}
