// 深度路径探测 - 检查是否有不同的 API 网关前缀
const TOKEN = 'st-4eb0a52c767b4f80bbdae6d1a30dfbb9'

const body = JSON.stringify({
    positivePrompt: 'test',
    width: 1024,
    height: 1024,
})

const paths = [
    // 原路径
    '/api/v1/ai-fusion-openapi/images/generations',
    // 可能的 trpc/next.js API route 前缀
    '/trpc/images.generations',
    // Next.js API routes
    '/api/images/generations',
    '/api/ai-fusion/images/generations',
    '/api/ai-fusion-openapi/images/generations',
    // 可能 v1 在不同位置
    '/v1/images/generations',
    // 检查 /api 是否返回某种路由表
    '/api/healthcheck',
    '/api/health',
    '/health',
    '/healthz',
    // 可能的 backend prefix
    '/backend/api/v1/ai-fusion-openapi/images/generations',
    '/server/api/v1/ai-fusion-openapi/images/generations',
    // 直接 openapi
    '/openapi/images/generations',
    '/openapi/v1/images/generations',
]

async function testPath(path) {
    try {
        const url = `https://aiart.happyelements.com${path}`
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TOKEN}`,
            },
            body,
        })
        const text = await res.text()
        const short = text.substring(0, 100).replace(/\n/g, ' ')
        if (res.status !== 404) {
            console.log(`✨ ${res.status} ${path} → ${short}`)
        } else {
            process.stdout.write('.')
        }
    } catch (err) {
        console.log(`  ERR ${path}: ${err.message}`)
    }
}

async function main() {
    console.log('=== 深度路径探测 ===\n')

    // 先测试 GET 请求找到非 404 的路径
    for (const path of ['/', '/api', '/api/', '/api/v1', '/api/v1/', '/health', '/healthz', '/api/healthcheck']) {
        try {
            const res = await fetch(`https://aiart.happyelements.com${path}`)
            const text = await res.text()
            const short = text.substring(0, 80).replace(/\n/g, ' ')
            if (res.status !== 404) {
                console.log(`GET ${res.status} ${path} → ${short}`)
            }
        } catch (e) { }
    }

    console.log('\n--- POST 路径探测 ---')
    for (const p of paths) {
        await testPath(p)
    }
    console.log('\nDone')
}

main()
