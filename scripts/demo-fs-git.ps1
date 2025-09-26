$ErrorActionPreference = "Stop"
npm run build | Out-Null

# Limpieza
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue out-repo
New-Item -ItemType Directory -Path logs -Force | Out-Null

# Instrucciones para el host (se alimentan por stdin)
@"
# FS: crear repo y escribir README
/call fs create_directory {"path":"out-repo"}
/call fs write_file {"path":"out-repo/README.md","content":"# Demo Repo - MCP`n`nGenerated via MCP host."}

# Git: init + add + commit
/call git git_set_working_dir {"path":"out-repo"}
/call git git_init {"path":"."}
/call git git_add {"path":"README.md"}
/call git git_commit {"message":"chore: initial commit"}

# Estado final
/call git git_status {}
/call git git_log {}
"@ | Set-Content scripts\_demo_git_in.txt

# Ejecutar host con input automatizado
node dist/host/cli.js < scripts\_demo_git_in.txt

Write-Host "`n== README ==" -ForegroundColor Cyan
Get-Content .\out-repo\README.md

Write-Host "`n== Logs (git) ==" -ForegroundColor Cyan
Get-Content .\logs\git.tx.jsonl -Tail 10
Get-Content .\logs\git.rx.jsonl -Tail 10

Write-Host "`n== Logs (fs) ==" -ForegroundColor Cyan
Get-Content .\logs\fs.tx.jsonl -Tail 10
Get-Content .\logs\fs.rx.jsonl -Tail 10
