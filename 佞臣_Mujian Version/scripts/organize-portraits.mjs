/**
 * 整理 NPC 角色卡文件到确认/备选文件夹
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const NPC_DIR = path.resolve(__dirname, '../public/images/npc')
const CONFIRMED_DIR = path.join(NPC_DIR, '确认')
const ALT_DIR = path.join(NPC_DIR, '备选')

fs.mkdirSync(CONFIRMED_DIR, { recursive: true })
fs.mkdirSync(ALT_DIR, { recursive: true })

const files = fs.readdirSync(NPC_DIR).filter(f => f.endsWith('.png'))

let confirmed = 0, alt = 0

for (const file of files) {
    const src = path.join(NPC_DIR, file)

    if (file.includes('确认')) {
        // 确认的图：提取角色 ID，重命名为干净的文件名
        // "fengdaozhi_确认.png" -> "fengdaozhi.png"
        // "erzhulei 确认.png" -> "erzhulei.png"
        const cleanName = file.replace(/[_ ]确认/, '')
        const dst = path.join(CONFIRMED_DIR, cleanName)
        fs.copyFileSync(src, dst)
        fs.unlinkSync(src)
        console.log(`✅ 确认: ${file} → 确认/${cleanName}`)
        confirmed++
    } else {
        // 备选图
        const dst = path.join(ALT_DIR, file)
        fs.copyFileSync(src, dst)
        fs.unlinkSync(src)
        console.log(`📁 备选: ${file} → 备选/${file}`)
        alt++
    }
}

console.log(`\n完成: ${confirmed} 张确认, ${alt} 张备选`)
console.log(`确认目录: ${CONFIRMED_DIR}`)
console.log(`备选目录: ${ALT_DIR}`)
