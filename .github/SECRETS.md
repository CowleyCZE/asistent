# GitHub Secrets pro CZE-asistent

Tento dokument popisuje poadovaná GitHub Secrets pro CI/CD pipeline.

## Požadované Secrets

### 1. Android Build Secrets

| Název Secretu | Popis | Příklad | Poznámka |
|---------------|-------|---------|---------|
| `ANDROID_KEYSTORE_FILE` | Base64 zakódovaný keystore soubor | `base64 -w 0 my-release-key.keystore` | Vyžadováno pro release build |
| `ANDROID_KEYSTORE_PASSWORD` | Heslo k keystore | `mykeystorepassword` | |
| `ANDROID_KEY_ALIAS` | Alias klíče | `my-key-alias` | |
| `ANDROID_KEY_PASSWORD` | Heslo k privátnímu klíči | `mykeypassword` | |

### 2. API Klíče

| Název Secretu | Popis | Příklad | Poznámka |
|---------------|-------|---------|---------|
| `GOOGLE_TRANSLATE_API_KEY` | Google Translate API klíč | `AIzaSy...` | Používán v `api-config.ts` |
| `WEBHOOK_API_KEY` | API klíč pro autentizaci webhooků | `my-secret-api-key` | Používán pro autentizaci odchozích webhooků |
| `WEBHOOK_HMAC_SECRET` | Tajný klíč pro HMAC podpis | `my-hmac-secret` | Používán pro HMAC verifikaci |

### 3. Supabase (pokud se používá)

| Název Secretu | Popis | Příklad | Poznámka |
|---------------|-------|---------|---------|
| `SUPABASE_ANON_KEY` | Supabase anonymní klíč | `eyJhbGciOiJIUzI1NiIs...` | |
| `SUPABASE_URL` | Supabase URL | `https://project-ref.supabase.co` | |

## Jak nastavit Secrets

1. Přejděte do nastavení repozitáře na GitHubu
2. Klikněte na **Settings > Secrets and variables > Actions**
3. Klikněte na **New repository secret**
4. Zadejte název a hodnotu secretu
5. Opakujte pro všechny požadované secrets

## Použití v Workflow

V workflow souboru použijte secrets následovně:

```yaml
- name: Build Android APK (Release)
  run: ns build android --env.production
  env:
    ANDROID_KEYSTORE_FILE: ${{ secrets.ANDROID_KEYSTORE_FILE }}
    ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
    ANDROID_KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
    ANDROID_KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
```

## Bezpečnostní doporučení

1. **Nikdy neukládejte secrets přímo do kódu** - vždy používejte GitHub Secrets
2. **Omezte přístup** - Nastavte minimální požadovaná oprávnění
3. **Rotujte secrets pravidelně** - Měňte API klíče a hesla každých 6-12 měsíců
4. **Používejte různé secrets pro různé prostředí** - Vývoj, testování, produkce

## Reference

- [GitHub Docs: Encrypted Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [NativeScript CI/CD](https://docs.nativescript.org/tooling/publishing/ci-cd)
