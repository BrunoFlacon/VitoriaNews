export async function transcodeVideo(file:string){

const cmd = `
ffmpeg -i ${file}
-vf scale=1920:1080 ${file}_1080.mp4 \
-vf scale=1280:720 ${file}_720.mp4 \
-vf scale=640:360 ${file}_360.mp4
`
await Deno.run({
cmd:["bash","-c",cmd]
}).status()

}