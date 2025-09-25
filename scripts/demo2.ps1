# scripts/demo.ps1
npm run build

# limpia salidas previas
Remove-Item -ErrorAction SilentlyContinue clip_*.mp4
Remove-Item -ErrorAction SilentlyContinue subtitled_*.mp4
New-Item -ItemType Directory -Path logs -Force | Out-Null

# demo handshake -> tools/list -> clips
node dist/tests/list-and-call.js

# aplica subtítulos al primer clip
node -e "import('./dist/host/mcpClient.js').then(async m=>{
  const c=new m.MCPClient('repurpose-local');
  await c.start('node',['dist/index.js']);
  const r=await c.callTool('subtitles',{ video:'clip_0.mp4', transcript:'src/samples/transcripts/transcript_test1.srt' });
  console.error('subtitles:', r.result?.content?.[0]?.text ?? r.error?.message);
  await c.stop();
}).catch(console.error)"

Write-Host "`n== Outputs ==" -ForegroundColor Cyan
Get-ChildItem clip_*.mp4,subtitled_*.mp4 | Select-Object Name,Length

Write-Host "`n== Logs (server RX/TX) ==" -ForegroundColor Cyan
Get-Content .\logs\repurpose-local.rx.jsonl -Tail 5
Get-Content .\logs\repurpose-local.tx.jsonl -Tail 5

Write-Host "`n== Server stderr ==" -ForegroundColor Cyan
Get-Content .\logs\repurpose-local.stderr.jsonl -Tail 10
