export function todaySeed(): number {
	const d = new Date();
	const yyyy = d.getFullYear();
	const mm = (d.getMonth() + 1).toString().padStart(2, '0');
	const dd = d.getDate().toString().padStart(2, '0');
	return Number(`${yyyy}${mm}${dd}`);
}

export const DEFAULT_MODELS = [
	"fal:any-llm:openai/gpt-4o-mini",
	"fal:any-llm:meta-llama/llama-3.1-70b-instruct",
	"fal:any-llm:qwen/qwen2.5-32b-instruct",
	"simulated",
] as const;


