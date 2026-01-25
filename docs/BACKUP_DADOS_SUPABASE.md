# Backup dos Dados do Schema Public - Supabase

## Método 1: Usando pg_dump diretamente (Recomendado)

### Pré-requisitos
- `pg_dump` instalado (já verificado: PostgreSQL 18.1)
- Senha do banco de dados do projeto Supabase

### Comando

```powershell
# Substitua [PASSWORD] pela senha do banco de dados
$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
pg_dump "postgresql://postgres:[PASSWORD]@db.tiaojwumxgdnobknlyqp.supabase.co:5432/postgres" `
    --data-only `
    --schema=public `
    --no-owner `
    --no-privileges `
    -f "backup_public_data_$timestamp.sql"
```

### Parâmetros explicados:
- `--data-only`: Apenas dados (INSERT), sem estrutura (CREATE TABLE, etc.)
- `--schema=public`: Apenas o schema `public`
- `--no-owner`: Não incluir comandos de ownership (evita erros ao restaurar)
- `--no-privileges`: Não incluir comandos de privilégios (evita erros ao restaurar)
- `-f`: Arquivo de saída

---

## Método 2: Usando o script PowerShell

Execute o script criado:

```powershell
.\backup_public_data.ps1
```

O script irá:
1. Solicitar a senha do banco (ou usar variável de ambiente `SUPABASE_DB_PASSWORD`)
2. Gerar o backup com timestamp
3. Mostrar o tamanho do arquivo gerado

---

## Método 3: Backup completo (estrutura + dados)

Se você quiser backup completo (estrutura + dados):

```powershell
$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
pg_dump "postgresql://postgres:[PASSWORD]@db.tiaojwumxgdnobknlyqp.supabase.co:5432/postgres" `
    --schema=public `
    --no-owner `
    --no-privileges `
    -f "backup_public_completo_$timestamp.sql"
```

---

## Onde encontrar a senha do banco

1. **Dashboard do Supabase:**
   - Acesse: https://supabase.com/dashboard/project/tiaojwumxgdnobknlyqp
   - Vá em **Settings** → **Database**
   - Em **Connection string**, use a senha do campo `[YOUR-PASSWORD]`

2. **Variável de ambiente:**
   - Configure: `$env:SUPABASE_DB_PASSWORD = "sua_senha"`

3. **Arquivo .env (se existir):**
   - Verifique se há um arquivo `.env` com `SUPABASE_DB_PASSWORD`

---

## Verificar o backup gerado

```powershell
# Ver tamanho do arquivo
Get-Item backup_public_data_*.sql | Select-Object Name, Length, LastWriteTime

# Ver primeiras linhas (verificar se tem dados)
Get-Content backup_public_data_*.sql -Head 20
```

---

## Restaurar o backup

```powershell
# Restaurar apenas dados (assumindo que estrutura já existe)
psql "postgresql://postgres:[PASSWORD]@db.tiaojwumxgdnobknlyqp.supabase.co:5432/postgres" `
    -f backup_public_data_YYYYMMDD_HHMMSS.sql
```

**⚠️ Atenção:** Restaurar dados pode sobrescrever dados existentes. Faça backup antes de restaurar!

---

## Informações do Projeto

- **Project ID:** `tiaojwumxgdnobknlyqp`
- **Host:** `db.tiaojwumxgdnobknlyqp.supabase.co`
- **Port:** `5432`
- **Database:** `postgres`
- **User:** `postgres`

---

## Troubleshooting

### Erro: "pg_dump: error: connection to server failed"
- Verifique se a senha está correta
- Verifique se o IP está liberado no Supabase (Settings → Database → Connection Pooling)

### Erro: "pg_dump: error: server version mismatch"
- Atualize o PostgreSQL client tools

### Arquivo muito grande
- Use compressão: adicione `-F c` para formato custom (comprimido)
- Ou use `-F t` para formato tar

```powershell
# Backup comprimido
pg_dump "postgresql://postgres:[PASSWORD]@db.tiaojwumxgdnobknlyqp.supabase.co:5432/postgres" `
    --data-only `
    --schema=public `
    -F c `
    -f "backup_public_data_$timestamp.dump"
```
