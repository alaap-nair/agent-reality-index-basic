# Judgment Arena

A platform for testing and comparing LLM capabilities across different games.
Current status: Dashboard isn't where it needs to be but backend logic should be working
LLM integration also needs to be more seamless, with a set of models being called, instead of hardcoded in .env.local

## Games

- **WordHunt**: Find words in a 4x4 grid (Boggle-style)
- **Deduction**: Solve logic puzzles with clues
- **BattleshipLite**: Place ships and fire at opponent's board
- **SequenceRecall**: Recognize and continue number sequences

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Create `.env.local` with:
   ```env
   # Required for FAL any-llm
   FAL_API_KEY=your_key_here
   FAL_BASE_URL=https://fal.run
   FAL_COMPLETIONS_PATH=/fal-ai/any-llm

   # Optional: Show cost per run (default "0")
   ARENA_SHOW_COST=1
   ```

## Development

```bash
# Start development server
pnpm dev

# Run daily benchmarks
pnpm daily

# Run smoke tests
pnpm smoke
```

## Model Examples

- `simulated` - Mock responses for testing
- `fal:any-llm:openai/gpt-4o-mini` - GPT-4 Turbo via FAL
- `fal:any-llm:meta-llama/llama-3.1-70b-instruct` - Llama 3 via FAL
- `fal:any-llm:qwen/qwen2.5-32b-instruct` - Qwen via FAL

## API Usage

```bash
# Run a game with a specific model and seed
curl -X POST http://localhost:3000/api/run/deduction \
  -H "Content-Type: application/json" \
  -d '{"model":"simulated","seed":20240312}'

# View scoreboard
open http://localhost:3000/arena
```

## Debug

Set `DEBUG_FAL=1` to see URL/body preview and queue logs:

```bash
DEBUG_FAL=1 pnpm daily
```