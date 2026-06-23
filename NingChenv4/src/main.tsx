import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { initAiService } from './ai/aiService'
import './styles/variables.css'
import './styles/global.css'

// 初始化 AI 服务（不阻塞渲染）
initAiService().then(mode => {
    console.log(`[佞臣] AI 模式: ${mode}`)
})

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
)
