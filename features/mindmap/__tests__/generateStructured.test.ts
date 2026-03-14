import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';

const mockGenerateContent = vi.fn();

// Mock @google/genai so GoogleGenAI constructor returns our mock
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent: mockGenerateContent };
  },
}));

vi.mock('../../../services/tokenUsageService', () => ({
  logTokenUsage: vi.fn(),
}));

beforeEach(() => {
  mockGenerateContent.mockReset();
  localStorage.setItem('gemini_api_key', 'test-api-key');
});

describe('generateStructured', () => {
  it('parses valid JSON response with Zod schema', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ name: 'test', value: 42 }),
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 },
    });

    const { generateStructured } = await import('../../../services/geminiService');
    const schema = z.object({ name: z.string(), value: z.number() });

    const result = await generateStructured<{ name: string; value: number }>(
      'test prompt',
      schema,
    );

    expect(result).toEqual({ name: 'test', value: 42 });
  });

  it('strips markdown JSON code block wrapper', async () => {
    mockGenerateContent.mockResolvedValue({
      text: '```json\n{"name":"stripped","value":99}\n```',
      usageMetadata: {},
    });

    const { generateStructured } = await import('../../../services/geminiService');
    const schema = z.object({ name: z.string(), value: z.number() });

    const result = await generateStructured<{ name: string; value: number }>(
      'test prompt',
      schema,
    );

    expect(result.name).toBe('stripped');
    expect(result.value).toBe(99);
  });

  it('calls logTokenUsage when userId and loggingContext provided', async () => {
    mockGenerateContent.mockResolvedValue({
      text: '{"label":"hello"}',
      usageMetadata: { promptTokenCount: 20, candidatesTokenCount: 10, totalTokenCount: 30 },
    });

    const { generateStructured } = await import('../../../services/geminiService');
    const { logTokenUsage } = await import('../../../services/tokenUsageService');
    const schema = z.object({ label: z.string() });

    await generateStructured<{ label: string }>(
      'prompt',
      schema,
      { feature: 'mindmap', actionType: 'mindmap-generate' },
      'user-123',
    );

    expect(logTokenUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-123',
        feature: 'mindmap',
        actionType: 'mindmap-generate',
        inputTokens: 20,
        outputTokens: 10,
        totalTokens: 30,
      }),
    );
  });

  it('throws ZodError-derived message when JSON does not match schema', async () => {
    mockGenerateContent.mockResolvedValue({
      text: '{"wrong_field":"oops"}',
      usageMetadata: {},
    });

    const { generateStructured } = await import('../../../services/geminiService');
    const schema = z.object({ name: z.string() });

    await expect(
      generateStructured('prompt', schema),
    ).rejects.toThrow(/không đúng định dạng/);
  });
});
