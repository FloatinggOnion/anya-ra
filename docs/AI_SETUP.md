# AI Setup Guide

Anya supports three AI providers for research assistance and chat features:
- **Ollama** - Local models with automatic management
- **llama.cpp** - Local GGUF models with high performance
- **OpenRouter** - Cloud-based models with broad selection

You can configure any one as your primary provider.

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

### 2. llama.cpp (Local, GGUF) - For Maximum Performance

Advanced users who want fine-grained control over inference and better performance can use **llama.cpp**, which runs quantized GGUF models with superior GPU support and optimization.

#### Installation

**macOS (via Homebrew):**
```bash
brew install llama.cpp
```

**Linux (build from source):**
```bash
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp
make
# Binary will be at: ./server
```

**Windows:**
Download prebuilt binaries from: https://github.com/ggerganov/llama.cpp/releases

#### Downloading Models

GGUF models are available on Hugging Face. Popular choices:

```bash
# Download a small, quantized model
# Example: Qwen2 0.5B quantized to Q4_K_M (fast, ~400MB)
cd ~/models  # Create a models directory
# Download from Hugging Face:
# https://huggingface.co/Qwen/Qwen2-0.5B-Instruct-GGUF/

# Or use a tool to download:
wget https://huggingface.co/Qwen/Qwen2-0.5B-Instruct-GGUF/resolve/main/qwen2-0.5b-instruct-q4_k_m.gguf
```

**Popular GGUF models:**
- **Qwen2 0.5B** (~400MB) - Fast, good for testing
- **Mistral 7B Q4** (~4GB) - Excellent balance of speed and quality
- **Llama2 7B Q4** (~4GB) - General purpose
- **Neural-Chat 7B Q4** (~4GB) - Optimized for conversation

Find more: https://huggingface.co (search for "GGUF")

#### Using llama.cpp in Anya

1. Launch Anya
2. Open **Settings** → **LLM Provider**
3. Select **llama.cpp**
4. Click **Detect Binary** (auto-finds llama.cpp installation)
   - If not found, click file picker to manually locate the `server` binary
5. Click **Select Model** and choose your .gguf file
6. Click **✓ Detect Binary** to start the server
7. Wait for "✓ Server connected" status
8. Start chatting!

**That's it!** llama.cpp is now running locally with your chosen model.

#### Performance Tips

- **Model Quantization Matters**: Q4_K_M is a sweet spot (quality vs speed)
  - Q5_K_S: Better quality, slower
  - Q4_K_M: Balanced (recommended)
  - Q3_K_M: Faster, lower quality
  
- **GPU Acceleration**: For even faster inference, build llama.cpp with GPU support:
  ```bash
  # For NVIDIA (CUDA)
  mkdir build && cd build
  cmake .. -DLLAMA_CUDA=ON
  cmake --build . --config Release
  
  # For Apple Silicon (Metal)
  cmake .. -DLLAMA_METAL=ON
  cmake --build . --config Release
  ```

---

### 3. OpenRouter (Cloud) - For Advanced Models

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

## Comparing Providers

| Aspect | Ollama | llama.cpp | OpenRouter |
|--------|--------|-----------|-----------|
| **Cost** | Free | Free | Pay-per-use |
| **Setup Difficulty** | Very easy | Moderate | Easy (API key) |
| **Speed** | Good | Excellent | Usually fastest (cloud) |
| **Model Variety** | Broad selection | GGUF models only | 100+ models |
| **Performance Control** | Limited | Fine-grained | None (cloud) |
| **GPU Support** | Good | Excellent | N/A |
| **Privacy** | Local (private) | Local (private) | Cloud (shared) |
| **Internet Required** | No | No | Yes |
| **Offline Use** | Yes | Yes | No |
| **Best For** | Beginners | Power users | Advanced models |

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

### llama.cpp Issues

**Problem: "Binary not found"**
- Ensure llama.cpp is installed and the `server` binary exists
- Try manually locating it: `which llama-server` or `which server`
- Rebuild from source if needed: https://github.com/ggerganov/llama.cpp

**Problem: "Server won't start"**
- Port 8000 might be in use; specify different port in settings
- Check your .gguf file path is correct and file exists
- Try launching manually: `./server -m model.gguf --listen localhost --port 8000`

**Problem: "Very slow responses"**
- Ensure you're not on CPU-only (consider GPU support)
- Model might be too large for your hardware
- Try a smaller/more-quantized model (Q4 instead of Q5)

**Problem: "Out of memory"**
- Your system doesn't have enough RAM for this model
- Try a smaller model (e.g., 7B instead of 13B)
- Reduce context size: model file parser shows limits

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

### For llama.cpp
- **Best quantization**: Q4_K_M (quality/speed balance)
- **Enable GPU**: Build with `-DLLAMA_CUDA=ON` or `-DLLAMA_METAL=ON`
- **Context size**: Check model's max context in Anya settings
- **Start small**: Test with 7B models before 13B+

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

**llama.cpp**:
- GitHub: https://github.com/ggerganov/llama.cpp
- GGUF Models: https://huggingface.co (search "GGUF")
- Quantization Guide: https://github.com/ggerganov/llama.cpp/blob/master/README.md

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
