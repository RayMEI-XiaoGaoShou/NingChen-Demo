/**
 * 《佞臣》历史地图 AI 风格化脚本
 * 通过 SiliconFlow API 对已生成的 4 张地图进行 img2img 风格化
 * 原始地图保留不动，风格化结果保存为 _styled 后缀
 *
 * 用法:  set SILICONFLOW_KEY=你的key && node scripts/stylize_maps.mjs
 * 可选:  node scripts/stylize_maps.mjs --variants 2   (每张图生成多个变体)
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ========================================
// 配置
// ========================================
const API_KEY = process.env.SILICONFLOW_KEY
const API_URL = 'https://api.siliconflow.cn/v1/images/generations'
const PROJECT_DIR = path.resolve(__dirname, '..')
const MAP_DIR = path.join(PROJECT_DIR, '地图资产')
const OUTPUT_DIR = path.join(MAP_DIR, 'styled')
const MODEL = 'Kwai-Kolors/Kolors'
const IMAGE_SIZE = '1024x1024' // Kolors 支持的分辨率

// 每张地图生成几个变体（可通过命令行 --variants N 覆盖）
let VARIANTS = 2
const variantsArg = process.argv.indexOf('--variants')
if (variantsArg !== -1 && process.argv[variantsArg + 1]) {
    VARIANTS = parseInt(process.argv[variantsArg + 1], 10) || 2
}

// ========================================
// 源地图文件
// ========================================
const SOURCE_MAPS = [
    {
        file: 'map_1_initial.png',
        id: 'map_1_initial',
        name: '南陈-北周初始对峙',
    },
    {
        file: 'map_2_bashu.png',
        id: 'map_2_bashu',
        name: '南陈占据巴蜀',
    },
    {
        file: 'map_3_bashu_huainan.png',
        id: 'map_3_bashu_huainan',
        name: '南陈占据巴蜀与淮南',
    },
    {
        file: 'map_4_huainan.png',
        id: 'map_4_huainan',
        name: '南陈占据淮南',
    },
]

// ========================================
// 风格化 Prompt — 力求在保持原图地理信息的同时增添质感
// ========================================
const STYLE_PROMPT = `Ancient Chinese historical strategy game campaign map, top-down cartographic view. Hand-painted parchment scroll style with ink wash painting aesthetic and subtle rice paper texture. Warm golden and burnt orange tones for territories, dark atmospheric ocean background. Subtle mountain ridges, terrain textures, and topographic details across land masses. Flowing blue rivers with watercolor brush strokes. Soft ambient glow on capital city markers. Bronze ornamental border frame with Chinese motifs. Cinematic dramatic lighting. Game UI quality, highly detailed. Style reference: Total War Three Kingdoms campaign map, Crusader Kings 3 terrain view. Maintain the exact same territory shapes, colors, borders, river positions, and city markers from the input image. Do not add or remove any geographic features.`

// ========================================
// 工具函数
// ========================================

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function imageToBase64(filepath) {
    const buffer = fs.readFileSync(filepath)
    const ext = path.extname(filepath).slice(1).toLowerCase()
    const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`
    return `data:${mime};base64,${buffer.toString('base64')}`
}

async function stylizeImage(base64Image, prompt) {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
            model: MODEL,
            prompt: prompt,
            image: base64Image,
            image_size: IMAGE_SIZE,
            num_inference_steps: 30,
            guidance_scale: 7.5,
            batch_size: 1,
        }),
    })

    if (!res.ok) {
        const text = await res.text()
        throw new Error(`API Error (${res.status}): ${text}`)
    }

    const json = await res.json()
    if (json.images && json.images.length > 0) {
        return { url: json.images[0].url, seed: json.seed }
    }
    throw new Error(`Unexpected response: ${JSON.stringify(json)}`)
}

async function downloadImage(url, filepath) {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Download failed: ${res.status}`)
    const buffer = Buffer.from(await res.arrayBuffer())
    fs.writeFileSync(filepath, buffer)
    return buffer.length
}

// ========================================
// 主流程
// ========================================

async function main() {
    if (!API_KEY) {
        console.error('❌ 请设置环境变量 SILICONFLOW_KEY')
        console.error('   用法: set SILICONFLOW_KEY=你的key && node scripts/stylize_maps.mjs')
        process.exit(1)
    }

    fs.mkdirSync(OUTPUT_DIR, { recursive: true })

    console.log('🗺️  《佞臣》历史地图 AI 风格化')
    console.log(`   模型: ${MODEL}`)
    console.log(`   图片尺寸: ${IMAGE_SIZE}`)
    console.log(`   每张地图变体数: ${VARIANTS}`)
    console.log(`   总生成数: ${SOURCE_MAPS.length} × ${VARIANTS} = ${SOURCE_MAPS.length * VARIANTS} 张`)
    console.log(`   源目录: ${MAP_DIR}`)
    console.log(`   输出目录: ${OUTPUT_DIR}`)
    console.log('─'.repeat(55))

    const results = []
    let totalSuccess = 0

    for (let i = 0; i < SOURCE_MAPS.length; i++) {
        const map = SOURCE_MAPS[i]
        const srcPath = path.join(MAP_DIR, map.file)

        if (!fs.existsSync(srcPath)) {
            console.error(`\n[${i + 1}/${SOURCE_MAPS.length}] ❌ 源文件不存在: ${srcPath}`)
            results.push({ id: map.id, name: map.name, count: 0 })
            continue
        }

        console.log(`\n[${i + 1}/${SOURCE_MAPS.length}] 🖌️  ${map.name} (${map.file})`)
        console.log(`   读取源图并编码 base64...`)
        const base64 = imageToBase64(srcPath)
        console.log(`   base64 长度: ${(base64.length / 1024).toFixed(0)} KB`)

        let mapSuccess = 0

        for (let v = 1; v <= VARIANTS; v++) {
            try {
                process.stdout.write(`   变体 ${v}/${VARIANTS} 风格化中...`)
                const { url, seed } = await stylizeImage(base64, STYLE_PROMPT)

                const filename = `${map.id}_styled_${v}.png`
                const filepath = path.join(OUTPUT_DIR, filename)
                const size = await downloadImage(url, filepath)
                console.log(` ✓ ${filename} (${(size / 1024).toFixed(0)}KB, seed:${seed})`)
                mapSuccess++
                totalSuccess++

                // 间隔 2 秒避免 rate limit
                await sleep(2000)
            } catch (err) {
                console.error(` ✗ ${err.message}`)
                if (err.message.includes('balance is insufficient')) {
                    console.error('\n💸 余额不足，终止生成。请充值后重新运行。')
                    printSummary(results, totalSuccess)
                    return
                }
                // 其他错误，等待后重试下一个
                await sleep(3000)
            }
        }
        results.push({ id: map.id, name: map.name, count: mapSuccess })
    }

    printSummary(results, totalSuccess)
}

function printSummary(results, totalSuccess) {
    const totalExpected = SOURCE_MAPS.length * VARIANTS
    console.log('\n' + '═'.repeat(55))
    console.log('📊 风格化结果汇总')
    console.log('═'.repeat(55))
    for (const r of results) {
        const icon = r.count === VARIANTS ? '✅' : r.count > 0 ? '⚠️' : '❌'
        console.log(`  ${icon} ${r.name} (${r.id}): ${r.count}/${VARIANTS} 张`)
    }
    console.log(`\n完成: ${totalSuccess}/${totalExpected} 张`)
    if (totalSuccess > 0) {
        console.log(`\n💡 风格化图片已保存到: ${OUTPUT_DIR}`)
        console.log('   文件名格式: 地图id_styled_变体号.png')
        console.log('\n📌 原始地图文件未被修改，保留在原位置。')
    }
}

main().catch(console.error)
