/** @internal Responses API dialect. Final output must additionally pass the shared script contract. */
import { z } from 'zod';
const response = z.object({ id: z.string().min(1).max(200), status: z.literal('completed'),
  output: z.array(z.object({ type: z.string(), role: z.string().optional(),
    content: z.array(z.object({ type: z.string(), text: z.string().max(100000).optional() })).optional(),
  })).max(50),
  usage: z.object({ input_tokens: z.number().int().nonnegative(),
    output_tokens: z.number().int().nonnegative() }).nullish(),
});
export function readOpenAiResponse(body: string) {
  const value = response.parse(JSON.parse(body));
  const messages = value.output.filter(o => o.type === 'message');
  if (messages.length !== 1 || messages[0]!.role !== 'assistant') throw new Error('Expected one assistant response');
  const content = messages[0]!.content;
  if (!content || content.length !== 1 || content[0]!.type !== 'output_text' || !content[0]!.text) {
    throw new Error('Refused or missing structured response');
  }
  return { responseId: value.id, output: JSON.parse(content[0]!.text) as unknown,
    usage: value.usage ?? null };
}
