// Vercel 서버리스 함수 - Notion API 프록시 (CORS 해결)
export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const DATABASE_ID = process.env.NOTION_DATABASE_ID;

  if (!NOTION_TOKEN || !DATABASE_ID) {
    return res.status(500).json({ error: 'Notion 환경변수가 설정되지 않았습니다.' });
  }

  try {
    const { title, category, content, status } = req.body;

    if (!title) {
      return res.status(400).json({ error: '제목이 필요합니다.' });
    }

    const notionBody = {
      parent: { database_id: DATABASE_ID },
      properties: {
        '제목': {
          title: [{ text: { content: title } }]
        },
        '분류': {
          select: { name: category || '기타' }
        },
        '내용': {
          rich_text: [{ text: { content: content || '' } }]
        },
        '날짜': {
          date: { start: new Date().toISOString().split('T')[0] }
        },
        '상태': {
          select: { name: status || '신규' }
        }
      }
    };

    const notionRes = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify(notionBody)
    });

    const data = await notionRes.json();

    if (!notionRes.ok) {
      return res.status(notionRes.status).json({ error: data.message || 'Notion 저장 실패' });
    }

    return res.status(200).json({ success: true, id: data.id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
