require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const Groq = require('groq-sdk');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Supabase 클라이언트 초기화
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// 임시 테스트용 유저 ID (원래는 Auth 연동 필요)
const TEST_USER_ID = '00000000-0000-0000-0000-000000000000';


const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ==========================================================================
// 🔄 [복구] 과거 여행 이력 관리 라우터 (기존 DB 조회 로직을 여기에 복사하세요)
// ==========================================================================
app.get('/api/history', async (req, res) => {
    try {
        // TODO: 기존에 작성하셨던 Supabase 등 DB 연동 코드가 있다면 여기에 넣으세요.
        // 현재는 프론트엔드 404 및 템플릿 에러를 막기 위해 임시 더미 데이터를 보냅니다.
        const dummyHistory = [
            { id: 1, title: "대구 치맥 페스티벌", date: "2025-07-05", region: "대구" }
        ];
        res.json({ success: true, data: dummyHistory });
    } catch (error) {
        console.error('이력 조회 에러:', error.message);
        res.status(500).json({ success: false, message: '이력을 가져오지 못했습니다.' });
    }
});

app.post('/api/history', async (req, res) => {
    // 1. 프론트엔드(app.js)에서 보낸 데이터를 받습니다.
    const { title, date } = req.body; 

    // 2. 데이터가 잘 들어왔는지 방어 코드
    if (!title) {
        return res.status(400).json({ success: false, message: '여행지 이름이 필요합니다.' });
    }

    try {
       

        console.log(`✅ [이력 추가 요청 수신] 여행지: ${title}, 날짜: ${date}`);
        res.json({ success: true, message: '여행 이력이 성공적으로 추가되었습니다!' });
    } catch (error) {
        console.error('이력 추가 에러:', error.message);
        res.status(500).json({ success: false, message: '이력 추가에 실패했습니다.' });
    }
});


// ==========================================================================
// 🔄 [추가] 보관함 스크랩 목록 '조회' 라우터 (GET 방식)
// ==========================================================================
app.get('/api/saved', async (req, res) => {
    try {
        // TODO: Supabase의 saved_destinations 테이블에서 목록을 불러오는 로직
        // 현재는 404 에러를 막기 위해 임시 더미 데이터를 보냅니다.
        const dummySaved = [
            { id: 1, title: "제주도 감귤 체험", date: "2026-10-12" }
        ];
        res.json({ success: true, data: dummySaved });
    } catch (error) {
        console.error('보관함 조회 에러:', error.message);
        res.status(500).json({ success: false, message: '보관함 목록을 가져오지 못했습니다.' });
    }
});


// ==========================================================================
// 🔄 [복구] 스크랩/저장 라우터 
// ==========================================================================
app.post('/api/saved', async (req, res) => {
    const { title, region, date } = req.body;
    // RLS 정책을 위해 user_id를 가져오는 로직 (실제 서비스에서는 로그인 정보 활용)
    const userId = req.headers['user-id']; 

    try {
        const { data, error } = await supabase
            .from('saved_destinations')
            .insert([{ title, region, date, user_id: userId }]);

        if (error) throw error;
        res.json({ success: true, message: "성공적으로 저장되었습니다!" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});


app.post('/api/chat', async (req, res) => {
    const { message } = req.body;

    try {
        const chatCompletion = await groq.chat.completions.create({
          "messages": [
        {
            "role": "system",
            "content": `당신은 대한민국 국내 여행 전문 가이드입니다. 
            모든 답변은 반드시 대한민국 내의 장소로 한정하세요.
            답변은 오직 다음 4가지 카테고리(축제, 숙소, 맛집, 교통수단)에 대한 정보만 제공하세요.
            위 4가지 범주를 벗어나는 질문에는 정중히 답변이 어렵다고 알리고 국내 여행지 관련 4가지 범주 중 하나로 질문을 유도하세요.`
        },
        {
            "role": "user",
            "content": message
        }
    ],
            // 사용할 모델 선택
            "model": "llama-3.1-8b-instant", 
        });

        const reply = chatCompletion.choices[0]?.message?.content;
        res.json({ success: true, reply: reply });
        
    } catch (error) {
        console.error('Groq API 에러:', error);
        res.status(500).json({ success: false, message: '챗봇 응답 생성 실패' });
    }
});



// ==========================================================================
// 🗺️ 추천 및 이미지 API (기존 유지)
// ==========================================================================
app.get('/api/recommendation', (req, res) => {
    const regions = ['서산', '부산', '제주도'];
    res.json({ success: true, region: regions[Math.floor(Math.random() * regions.length)] });
});

app.get('/api/planner-photo', async (req, res) => {
    try {
        const response = await axios.get(`https://api.unsplash.com/photos/random?query=${encodeURIComponent(req.query.keyword)}&client_id=${process.env.UNSPLASH_ACCESS_KEY}`);
        res.json({ success: true, imageUrl: `${response.data.urls.raw}&w=399&h=224&fit=crop` });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 서버가 포트 ${PORT}에서 작동 중입니다.`);
});