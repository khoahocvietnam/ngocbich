export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { topic, difficulty, numQuestions } = req.body;
    const API_KEY = process.env.GEMINI_API_KEY;
    
    if (!API_KEY) {
        return res.status(500).json({ error: 'API key not configured' });
    }

    // Cấu hình prompt
    const topicMap = {
        'lich-su': 'lịch sử Đội TNTP Hồ Chí Minh từ 1941',
        'nhan-vat': 'các anh hùng thiếu nhi Việt Nam',
        'phong-trao': 'các phong trào của Đội',
        'nghi-thuc': 'nghi thức và biểu tượng Đội',
        'bac-ho': 'Bác Hồ với thiếu nhi',
        'tng-hop': 'kiến thức về Đội TNTP'
    };

    const prompt = `Bạn là chuyên gia về Đội TNTP Hồ Chí Minh. Hãy tạo ${numQuestions} câu hỏi trắc nghiệm về ${topicMap[topic] || 'Đội TNTP'}.
    Yêu cầu: Trả về JSON format: [{"question": "...", "options": ["A...", "B...", "C...", "D..."], "correct": 0}]`;

    try {
        // SỬA LỖI: Bỏ tiền tố 'models/' trong URL và dùng gemini-1.5-flash
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    responseMimeType: "application/json"
                }
            })
        });

        const data = await response.json();

        if (data.error) {
            console.error('API Error:', data.error);
            return res.status(500).json({ error: data.error.message });
        }

        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        return res.status(200).json({ 
            success: true, 
            questions: JSON.parse(aiText) 
        });

    } catch (error) {
        console.error('Fetch Error:', error);
        return res.status(500).json({ error: 'Lỗi kết nối API, hãy kiểm tra lại cấu hình' });
    }
}
