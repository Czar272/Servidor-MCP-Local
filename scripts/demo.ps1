# build
npm run build

# limpia clips viejos
Remove-Item -ErrorAction SilentlyContinue clip_*.mp4

# corre el cliente handshake (initialize -> list -> clips)
node dist/tests/list-and-call.js

# muestra resultado y tamaños
Write-Host "`n== Outputs ==" -ForegroundColor Cyan
Get-ChildItem clip_*.mp4 | Select-Object Name,Length

# muestra últimas 5 líneas de logs RX/TX del server
Write-Host "`n== Logs (server RX/TX) ==" -ForegroundColor Cyan
Get-Content .\logs\repurpose-local.rx.jsonl -Tail 5
Get-Content .\logs\repurpose-local.tx.jsonl -Tail 5

# muestra errores de ffmpeg si hubo
Write-Host "`n== Server stderr ==" -ForegroundColor Cyan
Get-Content .\logs\repurpose-local.stderr.jsonl -Tail 10
