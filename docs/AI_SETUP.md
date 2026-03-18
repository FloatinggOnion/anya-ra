# AI Setup Guide

Anya supports two AI providers for research assistance and chat features: **Ollama** for local models and **OpenRouter** for cloud-based models. You can configure one or both.

## Quick Start

### 1. Ollama (Local, Free) - Recommended for Offline Use

The easiest option for getting started with AI features locally.

#### Installation

**macOS & Linux:**
```bash
curl https://ollama.ai/install.sh | sh
```

Or download from: https://ollama.ai

**Windows:**
Download from: https://ollama.ai/download/windows

#### Running Ollama

Start the Ollama service in the background:

```bash
# macOS/Linux
ollama serve

# Windows (GUI app)
# Simply launch the Ollama app from your applications
```

Ollama will listen on `http://localhost:11434`

#### Pulling Models

Pull a model for Anya to use:

```bash
# Lightweight, fast model (recommended for most users)
ollama pull qwen2:0.5b    # ~400MB

# Or choose other models:
ollama pull qwen2:1.5b    # ~1GB - better quality
ollama pull ollama/neural-chat  # ~4GB - specialized for chat
ollama pull mistral       # ~4GB - powerful open model
```

View available models: https://ollama.ai/library

#### Using Ollama in Anya

1. Launch Anya
2. Open **Settings** → **LLM Provider**
3. Select **Ollama** (default)
4. Verify "Status: Connected" appears
5. Start chatting with your papers!

**That's it!** No API keys or registration needed.

---

### 2. OpenRouter (Cloud) - For Advanced Models

Use cloud-based LLMs like GPT-4o, Claude, and Gemini without running local models.

#### Prerequisites

- OpenRouter account: https://openrouter.ai
- API key (free to create, you only pay for usage)

#### Getting Your API Key

1. Go to https://openrouter.ai
2. Sign up or login
3. Navigate to **API Keys** in settings
4. Create a new API key
5. Copy it (you'll only see it once)

#### Setting Up in Anya

1. Launch Anya
2. Open **Settings** → **LLM Provider**
3. Select **OpenRouter**
4. Paste your API key in the text field
5. Click **Save**
6. Verify "Status: Connected" appears

**Important**: Your API key is stored securely in your OS keychain—it never leaves your machine unencrypted.

#### Pricing & Models

OpenRouter is **pay-as-you-go**:
- **Billable**: Only when you use models
- **Pricing**: Listed per 1M input/output tokens
- **No subscription required**

**Popular Models on OpenRouter**:
- `openai/gpt-4o` - Most capable, ~$5/1M input tokens
- `anthropic/claude-3.5-sonnet` - Excellent reasoning, ~$3/1M input
- `google/gemini-1.5-flash` - Fast and cheap, ~$0.075/1M input
- `meta-llama/llama-3.1-70b` - Open source, powerful, ~$0.81/1M input

Default: `openai/gpt-4o-mini` (cheapest and fastest)

---

## Comparing Ollama vs OpenRouter

| Aspect | Ollama | OpenRouter |
|--------|--------|-----------|
| **Cost** | Free | Pay-per-use |
| **Setup** | Download + Install | API key only |
| **Speed** | Depends on your hardware | Usually faster (cloud) |
| **Model Quality** | Good open models | Access to GPT-4o, Claude, etc. |
| **Privacy** | Runs locally | Sent to OpenRouter's servers |
| **Internet Required** | No | Yes |
| **Available Offline** | Yes | No |

---

## Troubleshooting

### Ollama Issues

**Problem: "Failed to connect to Ollama"**
- Make sure Ollama is running: `ollama serve`
- Check it's accessible: `curl http://localhost:11434/api/tags`
- Try restarting Ollama

**Problem: "Model not found"**
- Pull a model: `ollama pull qwen2:0.5b`
- List available: `ollama list`

**Problem: "Out of memory" or slow responses**
- You might need a larger machine for bigger models
- Try smaller models: `qwen2:0.5b` or `qwen2:1.5b`
- Check system resources while running

**Problem: Ollama won't start on Mac**
- Try: `arch -arm64 ollama serve` (for Apple Silicon)
- Or check logs in `~/.ollama/`

### OpenRouter Issues

**Problem: "Invalid API key"**
- Verify your API key is correct and hasn't been revoked
- Generate a new key at https://openrouter.ai/keys

**Problem: "Insufficient credits"**
- You've exceeded your OpenRouter balance
- Add payment method at https://openrouter.ai/account/billing

**Problem: "Rate limit exceeded"**
- Slow down your requests
- Upgrade your OpenRouter plan for higher limits

**Problem: "401 Unauthorized"**
- API key is invalid or expired
- Generate a new key at https://openrouter.ai/keys

---

## Advanced Configuration

### Switching Between Providers

You can switch anytime in **Settings** → **LLM Provider**:
- Select provider (Ollama or OpenRouter)
- Enter API key if switching to OpenRouter
- Click **Save**
- Status will update to "Connected" or show error

### Model Selection

In the chat interface:
- **Ollama**: Select from installed local models
- **OpenRouter**: Dropdown shows 15+ available models

Default models:
- **Ollama**: `qwen2:0.5b`
- **OpenRouter**: `openai/gpt-4o-mini`

### Token Counting

Anya shows token counts to help you estimate usage:
- **Ollama**: Uses local tokenizer
- **OpenRouter**: Uses OpenAI tokenizer (cl100k_base)

---

## Security & Privacy

### Ollama
✅ **Private**: Everything runs on your machine  
✅ **Secure**: No data leaves your computer  
✅ **Offline**: Works without internet  
⚠️ **Resource intensive**: Requires CPU/GPU  

### OpenRouter
🔐 **API Key Storage**: Encrypted in OS keychain, never logged  
📤 **Data Sent**: Chat messages sent to OpenRouter to process  
🔒 **Secure Transport**: HTTPS encryption in transit  
⚠️ **Internet Required**: Needs active connection  

**Data Policy**:
- OpenRouter does not use your conversations for training
- See their privacy policy: https://openrouter.ai/privacy

---

## Performance Tips

### For Ollama
- Start with `qwen2:0.5b` (lightweight)
- Monitor system resources while chatting
- Increase model size if you have extra RAM/VRAM
- Use GPU support if available: https://ollama.ai/gpu

### For OpenRouter
- `gpt-4o-mini` is fast and affordable for most use cases
- `claude-3.5-sonnet` for best reasoning
- `gemini-1.5-flash` for balanced speed/cost

---

## Useful Links

**Ollama**:
- Official: https://ollama.ai
- Models: https://ollama.ai/library
- GitHub: https://github.com/jmorganca/ollama

**OpenRouter**:
- Official: https://openrouter.ai
- API Docs: https://openrouter.ai/docs
- Pricing: https://openrouter.ai/#pricing

---

## Questions?

- **Anya Issues**: Open a GitHub issue
- **Ollama Help**: https://github.com/jmorganca/ollama/discussions
- **OpenRouter Support**: support@openrouter.io
- **General Questions**: Email jesseosems123@gmail.com
