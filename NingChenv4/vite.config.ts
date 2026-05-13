import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    base: './',
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    const normalizedId = id.replace(/\\/g, '/')

                    if (
                        normalizedId.includes('/node_modules/react/') ||
                        normalizedId.includes('/node_modules/react-dom/') ||
                        normalizedId.includes('/node_modules/scheduler/')
                    ) {
                        return 'react-vendor'
                    }

                    if (normalizedId.includes('/src/ai/')) {
                        return 'ai-engine'
                    }

                    if (
                        normalizedId.includes('/src/game/') ||
                        normalizedId.includes('/src/stores/gameStore.ts') ||
                        normalizedId.includes('/src/stores/npcStore.ts')
                    ) {
                        return 'game-engine'
                    }

                    if (
                        normalizedId.includes('/src/data/npcs.ts') ||
                        normalizedId.includes('/src/data/policyQuestions.ts') ||
                        normalizedId.includes('/src/data/prologueContent.ts') ||
                        normalizedId.includes('/src/data/roundPublicStatements.ts') ||
                        normalizedId.includes('/src/data/roundPublicStatements.md') ||
                        normalizedId.includes('/src/data/roundStartRichBriefings.ts') ||
                        normalizedId.includes('/src/data/rounds.ts')
                    ) {
                        return 'game-data'
                    }

                    if (
                        normalizedId.includes('/src/components/Cover/') ||
                        normalizedId.includes('/src/components/Prologue/') ||
                        normalizedId.includes('/src/components/GameplayGuide/') ||
                        normalizedId.includes('/src/components/CharacterBios/')
                    ) {
                        return 'phase-entry'
                    }

                    if (
                        normalizedId.includes('/src/components/RoundStart/') ||
                        normalizedId.includes('/src/components/CourtView/') ||
                        normalizedId.includes('/src/components/SchemePanel/') ||
                        normalizedId.includes('/src/components/EmpressLetter/') ||
                        normalizedId.includes('/src/components/SchemeFeedback/')
                    ) {
                        return 'phase-core-loop'
                    }

                    if (
                        normalizedId.includes('/src/components/EmpressReply/') ||
                        normalizedId.includes('/src/components/Settlement/') ||
                        normalizedId.includes('/src/components/RoundEnd/') ||
                        normalizedId.includes('/src/components/Ending/')
                    ) {
                        return 'phase-resolution'
                    }

                    return undefined
                },
            },
        },
    },
    server: {
        proxy: {
            // 代理 AI API 请求，绕过 CORS
            '/api/ai': {
                target: 'https://api.deepseek.com',
                changeOrigin: true,
                rewrite: path => path.replace(/^\/api\/ai/, ''),
                secure: true,
            },
        },
    },
})
