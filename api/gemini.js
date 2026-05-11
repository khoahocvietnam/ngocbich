export default async function handler(req, res) {
    // Chỉ cho phép method POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { topic, difficulty, numQuestions } = req.body;

    // API key được lấy từ Environment Variable trên Vercel
    const API_KEY = process.env.GEMINI_API_KEY;
    
    if (!API_KEY) {
        return res.status(500).json({ error: 'API key not configured on server' });
    }

    const topicMap = {
        'lich-su': 'lịch sử Đội Thiếu niên Tiền phong Hồ Chí Minh từ 1941 đến nay, bao gồm các mốc thời gian quan trọng',
        'nhan-vat': 'các anh hùng, liệt sĩ thiếu nhi Việt Nam như Kim Đồng, Lý Tự Trọng, Võ Thị Sáu, Lê Văn Tám, Nguyễn Bá Ngọc',
        'phong-trao': 'các phong trào của Đội như Kế hoạch nhỏ, Nghìn việc tốt, Trần Quốc Toản, Vòng tay bè bạn',
        'nghi-thuc': 'nghi thức Đội, bài hát Đội ca, khăn quàng đỏ, huy hiệu Đội, chào cờ, hô đáp khẩu hiệu',
        'bac-ho': 'Bác Hồ với thiếu nhi, 5 điều Bác Hồ dạy, thư Bác gửi ngành Giáo dục, những câu nói nổi tiếng của Bác',
        'tng-hop': 'tổng hợp kiến thức về Đội TNTP Hồ Chí Minh'
    };

    const difficultyText = {
        'easy': 'dễ, kiến thức cơ bản, phù hợp với học sinh tiểu học',
        'medium': 'trung bình, cần suy luận, phù hợp với học sinh THCS',
        'hard': 'khó, chi tiết lịch sử cụ thể, dành cho học sinh giỏi'
    };

    const prompt = `Bạn là chuyên gia về lịch sử Đội Thiếu niên Tiền phong Hồ Chí Minh. Hãy tạo ${numQuestions} câu hỏi trắc nghiệm về ${topicMap[topic]}, độ ${difficultyText[difficulty]}.

Yêu cầu:
1. Mỗi câu hỏi có 4 lựa chọn A, B, C, D
2. Đáp án đúng phải chính xác theo lịch sử Việt Nam
3. Câu hỏi phải phù hợp với học sinh Việt Nam
4. Không trùng lặp nội dung

Trả về CHỈ DUY NHẤT một mảng JSON, không có text giải thích hay markdown, theo format chính xác:
[
  {
    "question": "nội dung câu hỏi",
    "options": ["A. lựa chọn 1", "B. lựa chọn 2", "C. lựa chọn 3", "D. lựa chọn 4"],
    "correct": 0
  }
]

Lưu ý: "correct" là chỉ số 0, 1, 2, 3 tương ứng với vị trí đáp án đúng trong mảng options (0 là A, 1 là B, 2 là C, 3 là D).`;

    try {
        // Dùng model gemini-2.5-flash-lite (phiên bản mới, nhanh và nhẹ)
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2000,
                    topP: 0.9
                }
            })
        });

        const data = await response.json();

        if (data.error) {
            console.error('Gemini API Error:', data.error);
            return res.status(500).json({ error: data.error.message });
        }

        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        // Tìm và parse JSON từ response
        const jsonMatch = aiText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            return res.status(500).json({ error: 'Invalid AI response format' });
        }

        let questions;
        try {
            questions = JSON.parse(jsonMatch[0]);
        } catch (e) {
            return res.status(500).json({ error: 'Failed to parse AI response' });
        }
        
        // Validate câu hỏi
        const validQuestions = questions.filter(q => 
            q.question && 
            Array.isArray(q.options) && 
            q.options.length === 4 &&
            typeof q.correct === 'number' &&
            q.correct >= 0 && q.correct <= 3
        );

        if (validQuestions.length === 0) {
            return res.status(500).json({ error: 'No valid questions generated' });
        }

        return res.status(200).json({ 
            success: true, 
            questions: validQuestions,
            count: validQuestions.length 
        });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
