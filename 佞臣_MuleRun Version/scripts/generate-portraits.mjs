/**
 * 《佞臣》NPC 角色卡批量生成脚本 V2 (全战三国风格)
 * 通过 SiliconFlow API 调用 Qwen-Image 模型
 * 每个角色生成 4 张变体，方便挑选
 * 
 * 用法: node scripts/generate-portraits.mjs
 * 环境变量: SILICONFLOW_KEY
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
const OUTPUT_DIR = path.resolve(__dirname, '../public/images/npc')
const MODEL = 'Qwen/Qwen-Image'
const IMAGE_SIZE = '1056x1584' // 2:3 竖版
const VARIANTS = 4 // 每个角色生成 4 张

// ========================================
// 全局风格前缀 — 对标《全面战争：三国》官方角色海报
// ========================================
const STYLE_PREFIX = `Total War Three Kingdoms official character portrait art style. Semi-realistic Chinese historical illustration with visible painterly brushstrokes. Clean white or off-white parchment background with subtle ink wash accents. The character stands as the focal point against the plain light background. Dynamic heroic upper-body pose. Saturated vivid colors on costume and armor. Period-accurate Northern and Southern Dynasties (6th century) Chinese aesthetics. Detailed face with strong expression, cinematic dramatic lighting on the character only. Digital painting, concept art quality. No text, no UI elements, no border. `

// ========================================
// 11 位 NPC 角色 Prompt (参照全战三国海报风格优化)
// ========================================
const NPC_PROMPTS = [
    {
        id: 'fengdaozhi',
        name: '冯道之',
        prompt: `A scholarly Chinese man in his late 50s, thin build, gentle and composed demeanor. Wearing simple dark-blue Confucian scholar robes with minimal adornment, a jade pendant at the waist and a black gauze cap (纱帽). Clean-shaven with a thin wispy beard, silver-streaked hair tied in a neat topknot. Deep-set intelligent eyes with a calm, detached expression that hints at hidden depth. Holding a folded bamboo fan in one hand and a bamboo scroll in the other. Light parchment background with faint ink wash mountain silhouettes. Muted color palette: navy, charcoal, pale jade green. Scholarly, understated.`,
    },
    {
        id: 'hebaqi',
        name: '贺拔琪',
        prompt: `A beautiful and commanding Chinese empress dowager in her mid-30s, young but exuding absolute authority and regal composure. Wearing elaborate crimson and gold ceremonial robes with intricate phoenix embroidery and layered silk collar. An ornate golden phoenix crown (凤冠) with dangling pearl and jade tassels framing her youthful face. Sharp, penetrating eyes with perfectly arched brows, a face that is strikingly beautiful yet cold and calculating. Subtle confident smirk. One hand resting elegantly on a dragon-carved armrest. Light background with a faint golden circular halo behind her (like the TW3K sun disc). Color palette: imperial crimson, burnished gold, deep black. The absolute center of power.`,
    },
    {
        id: 'yuwendi',
        name: '宇文棣',
        prompt: `A proud and ambitious Chinese prince in his mid-30s, radiating confident aggression. Wearing dark ceremonial armor with gold-inlaid shoulder pauldrons over princely black and gold court robes, a blend of military readiness and royal authority. A jade crown (玉冠) sits firmly on neatly combed black hair. Strong jawline, sharp fierce eyes full of ambition and defiance. Standing upright with one hand on the hilt of a ceremonial jian sword. Expression: slightly raised chin, looking down with supreme confidence. Light parchment background with subtle ink wash clouds. Color palette: obsidian black, imperial gold, deep wine red. Born to rule.`,
    },
    {
        id: 'weichimu',
        name: '尉迟暮',
        prompt: `A battle-hardened Chinese general in his late 40s, broad-shouldered and weathered by years of frontier warfare. Wearing heavy lamellar armor (札甲) with a dark iron breastplate, leather straps, and fur-lined shoulder guards, scarred and battle-worn. Tanned, wind-beaten face with a thick beard and stern, no-nonsense expression. Deep-set eyes that have seen too many battles. A heavy cloak draped over one shoulder. Gripping a war-halberd (戟). Light background with faint red/orange ink wash suggesting fire or sunset. Color palette: iron grey, rust brown, dusty gold, dried blood red. A soldier's soldier.`,
    },
    {
        id: 'zongai',
        name: '宗艾',
        prompt: `A slender Chinese eunuch court official in his 40s, with a smooth, pale face and an obsequious smile that doesn't reach his watchful eyes. Wearing modest dark grey court robes (朝服) of lower official rank, clean but deliberately plain. A small black cap. Thin eyebrows, thin lips, slightly hunched posture suggesting perpetual servility, but his eyes are sharp and calculating. Hands clasped together inside wide sleeves as if always hiding something. Light parchment background with subtle grey ink wash shadows. Color palette: slate grey, muted purple, sickly yellow. Underestimated by everyone, which is exactly how he wants it.`,
    },
    {
        id: 'zuting',
        name: '祖廷',
        prompt: `A severe and meticulous Chinese prime minister in his early 50s, with a thin angular face and cold, disapproving expression. Wearing immaculate high-ranking court robes (朝服) in deep indigo-purple with gold-thread cloud patterns, pristine and unwrinkled. A tall official cap (进贤冠). Narrow eyes behind slightly furrowed brows, thin lips pressed into a permanent look of disdain. One hand holds a jade-handled writing brush, the other a stack of imperial edicts. Light background with faint blue-grey ink wash. Color palette: midnight indigo, cold silver, parchment ivory. Power through paperwork.`,
    },
    {
        id: 'linghuelvguang',
        name: '令狐律光',
        prompt: `A dignified and imposing Chinese elder general in his early 60s, white-bearded and magnificent, a living legend. Wearing grand ceremonial armor (铠甲) in polished dark bronze and black, with a heavy fur-collared cloak signifying supreme military rank. A stern but wise face, deeply lined, with calm authoritative eyes. White hair tied back with a jade hair crown. Seated in a carved wooden commander's chair with hands on armrests. Light background with a large faint golden sun disc behind him and subtle ink wash mountains. Color palette: dark bronze, snow white, deep forest green, storm grey. The last wall between order and chaos.`,
    },
    {
        id: 'hebaboguei',
        name: '贺拔伯圭',
        prompt: `A swaggering and arrogant Chinese warlord in his late 30s, powerfully built with a face full of crude confidence. Wearing lavish and slightly ostentatious frontier general armor — polished golden lamellar plates over tiger-skin shoulder guards, heavy and ornate beyond what his rank warrants. Broad face, thick eyebrows, a mocking sneer, eyes radiating contempt for anyone beneath him. One hand gripping the pommel of an oversized dao sword. Light background with warm desert-gold ink wash gradients. Color palette: desert gold, blood orange, dark iron, sun-bleached sand. A man who treats a province like his personal kingdom.`,
    },
    {
        id: 'duguwenyue',
        name: '独孤文约',
        prompt: `A smooth and diplomatic Chinese frontier officer in his mid-30s, handsome with an easy, disarming smile that masks relentless calculation. Wearing refined but understated military officer robes, practical medium armor under a neatly draped dark green silk cloak, polished but not showy. Clean-shaven with well-groomed black hair in a silver hair clasp. Relaxed posture, one hand casually resting on a wine cup. Warm, inviting eyes that somehow give nothing away. Light parchment background with subtle jade-green ink wash accents. Color palette: jade green, warm amber, dark mahogany, subtle gold. Everyone's friend, nobody's fool.`,
    },
    {
        id: 'erzhulei',
        name: '尔朱烈',
        prompt: `A fierce and weathered nomadic chieftain-turned-Chinese-border-general in his late 40s, with the rugged features of a steppe warrior. Wearing hybrid armor blending Central Asian nomadic style with Chinese lamellar — leather-and-iron scale armor with wolf-fur trim, a heavy felt cloak, and nomadic riding boots. Sun-darkened face with prominent cheekbones, deep scars across one cheek, thick braided hair with bronze rings. Fierce hawk-like eyes, expression challenging and fearless. Gripping a curved steppe saber. Light background with a large faint red ink wash circle (blood moon) behind him. Color palette: steppe brown, iron grey, blood red, twilight amber. A wolf at the emperor's table.`,
    },
    {
        id: 'ansiming',
        name: '安思明',
        prompt: `A cold and calculating nomadic-origin Chinese border general in his early 40s, quieter and more controlled. Wearing dark practical nomadic-Chinese hybrid armor — blackened iron scale over leather, minimal decoration, a hooded dark wolf-fur cloak pulled partially up. Lean face, high cheekbones, narrow watchful eyes that reveal nothing. Stubble instead of a full beard, cropped hair under a simple iron helmet pushed back. Arms crossed, body language guarded and self-contained. Light parchment background with subtle cold blue-grey ink wash suggesting snow. Color palette: charcoal black, frost white, deep steel blue, muted earth tones. The silent one nobody sees leaving.`,
    },
]

// ========================================
// 工具函数
// ========================================

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

async function generateImage(prompt) {
    const fullPrompt = STYLE_PREFIX + prompt
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
            model: MODEL,
            prompt: fullPrompt,
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
        console.error('   用法: set SILICONFLOW_KEY=你的key && node scripts/generate-portraits.mjs')
        process.exit(1)
    }

    fs.mkdirSync(OUTPUT_DIR, { recursive: true })

    console.log('🎨 《佞臣》NPC 角色卡批量生成 V2 — 全战三国风格')
    console.log(`   模型: ${MODEL}`)
    console.log(`   图片尺寸: ${IMAGE_SIZE}`)
    console.log(`   每角色变体数: ${VARIANTS}`)
    console.log(`   总生成数: ${NPC_PROMPTS.length} × ${VARIANTS} = ${NPC_PROMPTS.length * VARIANTS} 张`)
    console.log(`   输出目录: ${OUTPUT_DIR}`)
    console.log('─'.repeat(55))

    const results = []
    let totalSuccess = 0

    for (let i = 0; i < NPC_PROMPTS.length; i++) {
        const npc = NPC_PROMPTS[i]
        console.log(`\n[${i + 1}/${NPC_PROMPTS.length}] 🖌️  ${npc.name} (${npc.id})`)
        let npcSuccess = 0

        for (let v = 1; v <= VARIANTS; v++) {
            try {
                process.stdout.write(`   变体 ${v}/${VARIANTS} 生成中...`)
                const { url, seed } = await generateImage(npc.prompt)

                const filename = `${npc.id}_${v}.png`
                const filepath = path.join(OUTPUT_DIR, filename)
                const size = await downloadImage(url, filepath)
                console.log(` ✓ ${filename} (${(size / 1024).toFixed(0)}KB, seed:${seed})`)
                npcSuccess++
                totalSuccess++

                // 间隔 1.5 秒避免 rate limit
                await sleep(1500)
            } catch (err) {
                console.error(` ✗ ${err.message}`)
                // 如果是余额不足，提前终止
                if (err.message.includes('balance is insufficient')) {
                    console.error('\n💸 余额不足，终止生成。请充值后重新运行。')
                    printSummary(results, totalSuccess)
                    return
                }
            }
        }
        results.push({ id: npc.id, name: npc.name, count: npcSuccess })
    }

    printSummary(results, totalSuccess)
}

function printSummary(results, totalSuccess) {
    const totalExpected = NPC_PROMPTS.length * VARIANTS
    console.log('\n' + '═'.repeat(55))
    console.log('📊 生成结果汇总')
    console.log('═'.repeat(55))
    for (const r of results) {
        const icon = r.count === VARIANTS ? '✅' : r.count > 0 ? '⚠️' : '❌'
        console.log(`  ${icon} ${r.name} (${r.id}): ${r.count}/${VARIANTS} 张`)
    }
    console.log(`\n完成: ${totalSuccess}/${totalExpected} 张`)
    if (totalSuccess > 0) {
        console.log(`\n💡 图片已保存到: ${OUTPUT_DIR}`)
        console.log('   文件名格式: 角色id_变体号.png (如 fengdaozhi_1.png)')
    }
}

main().catch(console.error)
