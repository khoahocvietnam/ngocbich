export default async function handler(req, res) {
    // Chỉ cho phép method POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { topic, difficulty, numQuestions } = req.body;

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
1. Mỗi câu hỏi có 4 lựa chọn A, B, C, D.
2. Đáp án đúng phải chính xác.
3. Không trùng lặp nội dung.

Trả về mảng JSON theo format:
[
  {
    "question": "nội dung câu hỏi",
    "options": ["A. lựa chọn 1", "B. lựa chọn 2", "C. lựa chọn 3", "D. lựa chọn 4"],
    "correct": 0
  }
]`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2000,
                    topP: 0.9,
                    responseMimeType: "application/json"
                }
            })
        });

        const data = await response.json();

        if (data.error) {
            return res.status(500).json({ error: data.error.message });
        }

        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!aiText) {
            return res.status(500).json({ error: 'Không nhận được dữ liệu từ AI' });
        }

        const questions = JSON.parse(aiText);

        return res.status(200).json({ 
            success: true, 
            questions: questions,
            count: questions.length 
        });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'Lỗi hệ thống, vui lòng thử lại sau.' });
    }
}
