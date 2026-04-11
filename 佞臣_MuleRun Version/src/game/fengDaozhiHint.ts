export function buildOmenAdvisorHint(round: number): string | null {
    if (round < 13) return null
    if (round === 13) {
        return '冯道之密语【谶纬】：“谶”读 chen。先写征兆，再释其意，最后顺着名分与法统去点谁最该警惕。'
    }
    if (round === 14 || round === 19 || round === 20) {
        return '冯道之密语【谶纬】：莫把谶纬写成普通挑拨；先有异象，再借它改人心对局势正当性的判断。'
    }
    return null
}
